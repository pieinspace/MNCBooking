do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'studio_status'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'studio_availability'
  ) then
    alter type public.studio_status rename to studio_availability;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'studios'
      and column_name = 'status'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'studios'
      and column_name = 'availability_status'
  ) then
    alter table public.studios rename column status to availability_status;
  end if;
end;
$$;

create or replace function public.bookings_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.studios
      where id = new.studio_id
        and is_active
        and availability_status = 'available'
    ) then
      raise exception 'Studio tidak tersedia';
    end if;
    if new.start_time <= now() then
      raise exception 'Waktu booking harus di masa depan';
    end if;
    if new.end_time <= new.start_time then
      raise exception 'Jam selesai harus setelah jam mulai';
    end if;
    new.status := 'pending';
    new.notes := null;
  elsif not public.is_staff(auth.uid()) then
    if new.status <> old.status
       and not (old.status = 'pending' and new.status = 'cancelled') then
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

notify pgrst, 'reload schema';
