-- Odometer readings with monotonic history, same-day replacement and auditable corrections.
-- Spec 003 §5.7, invariants I1, I2, I4–I7, I10.

create table public.odometer_readings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  vehicle_id uuid not null,
  reading_date date not null default private.today_bogota(),
  km integer not null check (km between 0 and 2000000),
  source public.reading_source not null default 'manual',
  service_record_id uuid,
  deleted_at timestamptz,
  correction_reason text check (correction_reason is null or char_length(correction_reason) between 5 and 200),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (vehicle_id, account_id) references public.vehicles (id, account_id) on delete cascade,
  check ((source = 'service') = (service_record_id is not null))
);

create index odometer_readings_vehicle_date_idx
  on public.odometer_readings (vehicle_id, reading_date)
  where deleted_at is null;

create trigger odometer_readings_set_updated_at
before update on public.odometer_readings
for each row execute function private.set_updated_at();

-- Runs as the caller: RLS limits what it can see, so error details never reveal other accounts.
create function private.odometer_readings_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_max_before integer;
  v_min_after integer;
  v_same_day integer;
  v_changed_value boolean := tg_op = 'INSERT';
begin
  if tg_op = 'UPDATE' then
    if new.account_id is distinct from old.account_id
      or new.vehicle_id is distinct from old.vehicle_id
      or new.source is distinct from old.source
      or new.service_record_id is distinct from old.service_record_id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'immutable_column' using errcode = 'P0001';
    end if;

    if old.deleted_at is not null then
      raise exception 'reading_deleted' using errcode = 'P0001';
    end if;

    v_changed_value := new.km is distinct from old.km or new.reading_date is distinct from old.reading_date;

    -- I7: service readings follow their service record; they are only removed when it is voided.
    if old.source = 'service' then
      if v_changed_value then
        raise exception 'service_reading_immutable' using errcode = 'P0001';
      end if;
      if new.deleted_at is not null and not exists (
        select 1 from public.service_records s
        where s.id = new.service_record_id and s.voided_at is not null
      ) then
        raise exception 'service_reading_immutable' using errcode = 'P0001';
      end if;
    elsif (v_changed_value or new.deleted_at is not null)
      and new.correction_reason is not distinct from old.correction_reason then
      -- Every correction of a manual reading needs its own reason (audited).
      raise exception 'correction_reason_required' using errcode = 'P0001';
    end if;

    -- I6: a vehicle always keeps at least one active reading.
    if new.deleted_at is not null and not exists (
      select 1 from public.odometer_readings r
      where r.vehicle_id = new.vehicle_id and r.deleted_at is null and r.id <> new.id
    ) then
      raise exception 'last_reading' using errcode = 'P0001';
    end if;
  end if;

  if new.reading_date > private.today_bogota() then
    raise exception 'date_in_future' using errcode = 'P0001';
  end if;

  if new.deleted_at is not null or not v_changed_value then
    return new;
  end if;

  -- I4: serialize writes per vehicle, then check the history stays monotonic by date.
  perform pg_advisory_xact_lock(hashtextextended('odometer:' || new.vehicle_id::text, 0));

  select max(r.km) into v_max_before
  from public.odometer_readings r
  where r.vehicle_id = new.vehicle_id and r.deleted_at is null and r.id <> new.id
    and r.reading_date < new.reading_date;

  if v_max_before is not null and new.km < v_max_before then
    raise exception 'reading_lower_than_previous'
      using errcode = 'P0001', detail = format('previous_km=%s', v_max_before);
  end if;

  select min(r.km) into v_min_after
  from public.odometer_readings r
  where r.vehicle_id = new.vehicle_id and r.deleted_at is null and r.id <> new.id
    and r.reading_date > new.reading_date;

  if v_min_after is not null and new.km > v_min_after then
    raise exception 'reading_higher_than_later'
      using errcode = 'P0001', detail = format('later_km=%s', v_min_after);
  end if;

  -- I5: on the same date only a higher value is accepted (a service may equal the manual value).
  select max(r.km) into v_same_day
  from public.odometer_readings r
  where r.vehicle_id = new.vehicle_id and r.deleted_at is null and r.id <> new.id
    and r.reading_date = new.reading_date;

  if v_same_day is not null and (new.km < v_same_day or (new.km = v_same_day and new.source = 'manual')) then
    raise exception 'reading_not_higher_same_day'
      using errcode = 'P0001', detail = format('same_day_km=%s', v_same_day);
  end if;

  return new;
end;
$$;

create trigger odometer_readings_before_write
before insert or update on public.odometer_readings
for each row execute function private.odometer_readings_before_write();

-- I5: a higher manual value replaces earlier manual readings of that day (soft delete, audited).
-- Service readings never supersede, so voiding a service always leaves the manual history intact.
create function private.odometer_readings_supersede_same_day()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null or new.source <> 'manual' then
    return null;
  end if;

  update public.odometer_readings r
  set deleted_at = now(), correction_reason = 'superseded'
  where r.vehicle_id = new.vehicle_id
    and r.reading_date = new.reading_date
    and r.id <> new.id
    and r.source = 'manual'
    and r.deleted_at is null
    and r.km < new.km;

  return null;
end;
$$;

create trigger odometer_readings_supersede_same_day
after insert or update of km, reading_date on public.odometer_readings
for each row execute function private.odometer_readings_supersede_same_day();
