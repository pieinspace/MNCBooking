drop trigger if exists bookings_guard on public.bookings;
drop function if exists public.get_busy_slots(uuid, date);
drop function if exists public.bookings_guard();

do $$
begin
  if exists (select 1 from public.bookings where status::text = 'completed') then
    raise exception 'Migration halted: archive or explicitly migrate completed bookings before changing booking_status.';
  end if;
end;
$$;

alter table public.bookings drop constraint if exists no_overlap;
alter table public.bookings drop constraint if exists bookings_valid_range_check;

alter type public.studio_availability rename to studio_status;
alter table public.studios rename column availability_status to status;

alter table public.profiles rename column phone to phone_number;
alter table public.profiles
  add column updated_at timestamptz not null default now();
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid());

alter type public.booking_status rename value 'confirmed' to 'approved';
create type public.booking_status_next as enum ('pending', 'approved', 'rejected', 'cancelled');

alter table public.bookings
  add column start_time_next timestamptz,
  add column end_time_next timestamptz;

update public.bookings
set start_time_next = (booking_date + start_time) at time zone 'Asia/Jakarta',
    end_time_next = (booking_date + end_time) at time zone 'Asia/Jakarta';

alter table public.bookings
  alter column start_time_next set not null,
  alter column end_time_next set not null,
  drop column booking_date,
  drop column start_time,
  drop column end_time;

alter table public.bookings rename column start_time_next to start_time;
alter table public.bookings rename column end_time_next to end_time;
alter table public.bookings rename column phone to pic_contact;
alter table public.bookings rename column purpose to production_purpose;
alter table public.bookings rename column admin_note to notes;

alter table public.bookings drop constraint if exists bookings_user_id_fkey;
alter table public.bookings
  add constraint bookings_user_id_fkey foreign key (user_id)
  references public.profiles(id) on delete cascade;

alter table public.user_roles drop constraint if exists user_roles_user_id_role_key;
alter table public.user_roles drop constraint if exists user_roles_pkey;
alter table public.user_roles drop column id;
alter table public.user_roles
  add constraint user_roles_pkey primary key (user_id, role);

alter table public.bookings alter column status drop default;
alter table public.bookings
  alter column status type public.booking_status_next
  using status::text::public.booking_status_next;
drop type public.booking_status;
alter type public.booking_status_next rename to booking_status;
alter table public.bookings alter column status set default 'pending';

alter table public.bookings
  add constraint bookings_valid_range_check check (end_time > start_time),
  add constraint no_overlap exclude using gist (
    studio_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status in ('pending', 'approved'));

create table public.studio_equipment (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  item_name text not null,
  quantity integer not null default 1,
  condition text not null default 'good',
  notes text,
  created_at timestamptz not null default now(),
  constraint studio_equipment_quantity_check check (quantity > 0)
);
grant select, insert, update, delete on public.studio_equipment to authenticated;
grant all on public.studio_equipment to service_role;
alter table public.studio_equipment enable row level security;
create policy "internal read equipment" on public.studio_equipment
  for select to authenticated using (
    exists (
      select 1 from public.studios s
      where s.id = studio_id and (s.is_active or public.is_staff(auth.uid()))
    )
  );
create policy "admin insert equipment" on public.studio_equipment
  for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "admin update equipment" on public.studio_equipment
  for update to authenticated using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
create policy "admin delete equipment" on public.studio_equipment
  for delete to authenticated using (public.is_staff(auth.uid()));

create table public.booking_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  action text not null,
  changed_at timestamptz not null default now(),
  previous_status public.booking_status,
  new_status public.booking_status
);
grant select on public.booking_logs to authenticated;
grant all on public.booking_logs to service_role;
alter table public.booking_logs enable row level security;
create policy "read own or staff booking logs" on public.booking_logs
  for select to authenticated using (
    public.is_staff(auth.uid()) or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

create or replace function public.set_profile_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_profile_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone_number, division)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone_number', new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'division', '')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.bookings_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.studios
      where id = new.studio_id and is_active and status = 'available'
    ) then
      raise exception 'Studio tidak tersedia';
    end if;
    if new.start_time <= now() then raise exception 'Waktu booking harus di masa depan'; end if;
    if new.end_time <= new.start_time then raise exception 'Jam selesai harus setelah jam mulai'; end if;
    new.status := 'pending';
    new.notes := null;
  elsif not public.is_staff(auth.uid()) then
    if new.status <> old.status and not (old.status = 'pending' and new.status = 'cancelled') then
      raise exception 'Tidak diizinkan mengubah status booking';
    end if;
    new.studio_id := old.studio_id;
    new.user_id := old.user_id;
    new.start_time := old.start_time;
    new.end_time := old.end_time;
    new.requester_name := old.requester_name;
    new.pic_name := old.pic_name;
    new.pic_contact := old.pic_contact;
    new.division := old.division;
    new.production_purpose := old.production_purpose;
    new.notes := old.notes;
  end if;
  return new;
end;
$$;
create trigger bookings_guard before insert or update on public.bookings
  for each row execute function public.bookings_guard();

create or replace function public.log_booking_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_logs (booking_id, changed_by, action, previous_status, new_status)
    values (new.id, coalesce(auth.uid(), new.user_id), 'created', null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.booking_logs (booking_id, changed_by, action, previous_status, new_status)
    values (
      new.id,
      auth.uid(),
      case new.status when 'approved' then 'approved' when 'rejected' then 'rejected'
        when 'cancelled' then 'cancelled' else 'status_changed' end,
      old.status,
      new.status
    );
  end if;
  return new;
end;
$$;
create trigger bookings_audit_log after insert or update on public.bookings
  for each row execute function public.log_booking_change();

create or replace function public.get_busy_slots(_studio_id uuid, _date date)
returns table (start_time timestamptz, end_time timestamptz, status public.booking_status)
language sql stable security definer set search_path = public as $$
  select b.start_time, b.end_time, b.status
  from public.bookings b
  where auth.uid() is not null
    and b.studio_id = _studio_id
    and b.start_time < ((_date + 1)::timestamp at time zone 'Asia/Jakarta')
    and b.end_time > (_date::timestamp at time zone 'Asia/Jakarta')
    and b.status in ('pending', 'approved')
  order by b.start_time
$$;
grant execute on function public.get_busy_slots(uuid, date) to authenticated;
