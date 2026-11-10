create extension if not exists btree_gist;

create type public.app_role as enum ('user','admin');
create type public.studio_category as enum ('tv','radio','podcast','dubbing','green_screen');
create type public.studio_availability as enum ('available','maintenance');
create type public.booking_status as enum ('pending','confirmed','completed','rejected','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  division text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin')
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, division)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'division','')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.studio_category not null,
  description text not null default '',
  location text not null default '',
  capacity int not null default 10,
  facilities text[] not null default '{}',
  related_divisions text[] not null default '{}',
  image_url text,
  availability_status public.studio_availability not null default 'available',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint studios_capacity_check check (capacity > 0)
);
grant select, insert, update, delete on public.studios to authenticated;
grant all on public.studios to service_role;
alter table public.studios enable row level security;
create policy "internal read active studios" on public.studios for select to authenticated using (is_active or public.is_staff(auth.uid()));
create policy "admin insert studios" on public.studios for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "admin update studios" on public.studios for update to authenticated using (public.is_staff(auth.uid()));
create policy "admin delete studios" on public.studios for delete to authenticated using (public.is_staff(auth.uid()));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  requester_name text not null default '',
  pic_name text not null default '',
  phone text not null default '',
  division text not null default '',
  purpose text not null default '',
  status public.booking_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  constraint bookings_valid_range_check check (end_time > start_time),
  constraint bookings_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint no_overlap exclude using gist (
    studio_id with =,
    tsrange(booking_date + start_time, booking_date + end_time) with &&
  ) where (status in ('pending','confirmed'))
);
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "read own or staff" on public.bookings for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "insert own" on public.bookings for insert to authenticated with check (user_id = auth.uid());
create policy "update own or staff" on public.bookings for update to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.bookings_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.studios where id = new.studio_id and is_active) then
      raise exception 'Studio tidak tersedia';
    end if;
    if new.booking_date < current_date then raise exception 'Tanggal sudah lewat'; end if;
    new.status := 'pending';
    new.admin_note := null;
  elsif tg_op = 'UPDATE' and not public.is_staff(auth.uid()) then
    if new.status <> old.status and not (old.status = 'pending' and new.status = 'cancelled') then
      raise exception 'Tidak diizinkan mengubah status';
    end if;
    new.studio_id := old.studio_id; new.user_id := old.user_id;
    new.booking_date := old.booking_date; new.start_time := old.start_time; new.end_time := old.end_time;
    new.admin_note := old.admin_note;
  end if;
  return new;
end; $$;
create trigger bookings_guard before insert or update on public.bookings for each row execute function public.bookings_guard();

create or replace function public.get_busy_slots(_studio_id uuid, _date date)
returns table (start_time time, end_time time, status public.booking_status)
language sql stable security definer set search_path = public as $$
  select b.start_time, b.end_time, b.status from public.bookings b
  where b.studio_id = _studio_id and b.booking_date = _date and b.status in ('pending','confirmed')
  order by b.start_time
$$;
grant execute on function public.get_busy_slots(uuid, date) to authenticated;

insert into public.studios (id, name, category, description, location, capacity, facilities, related_divisions) values
('50b5ea6e-c8eb-86c8-a9cc-4dd6965a4a90','Studio TV 1','tv','Studio siaran utama dengan lighting profesional, set modular, dan control room.','Gedung MNC News · Lantai 3',12, array['Kamera 4K','Teleprompter','LED Lighting','Control Room'], array['RCTI','MNCTV','GTV','iNews']),
('0f62dee0-fb1f-881e-ae44-27c8f0b8da06','Studio Radio/Podcast','podcast','Ruang akustik untuk podcast, wawancara, siaran radio, dan produksi audio.','Gedung MNC Radio · Lantai 2',8, array['Booth Kedap Suara','4 Mikrofon','Mixer Audio','Live Streaming'], array['MNC Radio','Production']),
('43052ab3-791e-8b1d-a0ba-815b53582b45','Studio Dubbing','dubbing','Studio voice recording dan dubbing dengan booth kedap suara.','Gedung MNC Media · Lantai 4',5, array['Isolation Booth','Pro Tools','Booth Monitor','Video Playback'], array['RCTI','MNCTV','GTV','iNews','MNC Pictures']),
('7f917a5d-25c5-8073-ad9f-2475b43517cb','Green Screen Room','green_screen','Ruang chroma key untuk virtual set, wawancara, dan produksi konten digital.','Gedung MNC Production · Lantai 2',10, array['Green Screen Cyclorama','Key Lighting','Virtual Set','Kamera 4K'], array['Production','MNC Animation']);