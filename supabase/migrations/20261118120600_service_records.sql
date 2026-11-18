-- Immutable service history (void only) that feeds the odometer. Spec 003 §5.9, invariants I2, I8, I9, I10.

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  vehicle_id uuid not null,
  maintenance_type_id uuid not null references public.maintenance_types (id),
  service_date date not null,
  km integer check (km is null or km between 0 and 2000000),
  expires_on date,
  cost_cop bigint check (cost_cop is null or cost_cop between 0 and 1000000000),
  workshop text check (workshop is null or char_length(workshop) between 1 and 100),
  notes text check (notes is null or char_length(notes) between 1 and 1000),
  is_approximate boolean not null default false,
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(void_reason) between 5 and 200),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, account_id) references public.vehicles (id, account_id) on delete cascade,
  check ((voided_at is null) = (void_reason is null)),
  check (expires_on is null or (expires_on >= service_date and expires_on <= service_date + interval '10 years'))
);

create index service_records_vehicle_type_idx
  on public.service_records (vehicle_id, maintenance_type_id, service_date desc)
  where voided_at is null;

alter table public.odometer_readings
  add constraint odometer_readings_service_record_fkey
  foreign key (service_record_id) references public.service_records (id) on delete restrict;

create index odometer_readings_service_record_idx on public.odometer_readings (service_record_id)
  where service_record_id is not null;

create function private.service_records_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_kind public.maintenance_kind;
begin
  if tg_op = 'UPDATE' then
    -- I8: only voiding is allowed, exactly once.
    if old.voided_at is not null then
      raise exception 'service_record_voided' using errcode = 'P0001';
    end if;
    if (new.id, new.account_id, new.vehicle_id, new.maintenance_type_id, new.service_date, new.km, new.expires_on,
        new.cost_cop, new.workshop, new.notes, new.is_approximate, new.created_by, new.created_at)
      is distinct from
       (old.id, old.account_id, old.vehicle_id, old.maintenance_type_id, old.service_date, old.km, old.expires_on,
        old.cost_cop, old.workshop, old.notes, old.is_approximate, old.created_by, old.created_at) then
      raise exception 'service_record_immutable' using errcode = 'P0001';
    end if;
    return new;
  end if;

  new.workshop := nullif(btrim(new.workshop), '');
  new.notes := nullif(btrim(new.notes), '');

  if new.voided_at is not null then
    raise exception 'service_record_voided' using errcode = 'P0001';
  end if;

  if new.service_date > private.today_bogota() then
    raise exception 'date_in_future' using errcode = 'P0001';
  end if;

  v_kind := private.assert_type_applies(new.vehicle_id, new.maintenance_type_id);

  if v_kind = 'mechanical' and (new.km is null or new.expires_on is not null) then
    raise exception 'mechanical_requires_km' using errcode = 'P0001';
  end if;

  if v_kind = 'legal' and new.expires_on is null then
    raise exception 'legal_requires_expiry' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger service_records_before_write
before insert or update on public.service_records
for each row execute function private.service_records_before_write();

-- AFTER triggers run only once the row passed RLS (membership verified), so they may act as
-- definer to write the linked service reading, which users cannot insert directly.
create function private.service_records_sync_reading()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.km is not null then
    insert into public.odometer_readings (account_id, vehicle_id, reading_date, km, source, service_record_id, created_by)
    values (new.account_id, new.vehicle_id, new.service_date, new.km, 'service', new.id, new.created_by);
  elsif tg_op = 'UPDATE' and old.voided_at is null and new.voided_at is not null then
    update public.odometer_readings r
    set deleted_at = now(), correction_reason = 'service voided'
    where r.service_record_id = new.id and r.deleted_at is null;
  end if;
  return null;
end;
$$;

revoke execute on function private.service_records_sync_reading() from public;

create trigger service_records_sync_reading
after insert or update of voided_at on public.service_records
for each row execute function private.service_records_sync_reading();
