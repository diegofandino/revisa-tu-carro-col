-- Maintenance rules per vehicle and type. Spec 003 §5.8, invariants I2, I9, I11.

create table public.maintenance_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  vehicle_id uuid not null,
  maintenance_type_id uuid not null references public.maintenance_types (id),
  interval_km integer check (interval_km is null or interval_km between 100 and 200000),
  interval_months smallint check (interval_months is null or interval_months between 1 and 120),
  suggestion_id uuid references public.interval_suggestions (id),
  archived_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (vehicle_id, account_id) references public.vehicles (id, account_id) on delete cascade
);

create unique index maintenance_rules_active_key
  on public.maintenance_rules (vehicle_id, maintenance_type_id)
  where archived_at is null;

create trigger maintenance_rules_set_updated_at
before update on public.maintenance_rules
for each row execute function private.set_updated_at();

-- Shared check: the type must apply to the vehicle's class. Runs as the caller (RLS applies).
create function private.assert_type_applies(p_vehicle_id uuid, p_type_id uuid)
returns public.maintenance_kind
language plpgsql
stable
set search_path = ''
as $$
declare
  v_class public.vehicle_class;
  v_kind public.maintenance_kind;
  v_applies public.vehicle_class[];
begin
  select v.class into v_class from public.vehicles v where v.id = p_vehicle_id;
  if v_class is null then
    raise exception 'vehicle_not_found' using errcode = 'P0001';
  end if;

  select t.kind, t.applies_to into v_kind, v_applies from public.maintenance_types t where t.id = p_type_id;
  if v_kind is null then
    raise exception 'maintenance_type_not_found' using errcode = 'P0001';
  end if;

  if not (v_class = any (v_applies)) then
    raise exception 'type_not_applicable' using errcode = 'P0001';
  end if;

  return v_kind;
end;
$$;

revoke execute on function private.assert_type_applies(uuid, uuid) from public;
grant execute on function private.assert_type_applies(uuid, uuid) to authenticated, service_role;

create function private.maintenance_rules_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_kind public.maintenance_kind;
begin
  if tg_op = 'UPDATE' and (
    new.account_id is distinct from old.account_id
    or new.vehicle_id is distinct from old.vehicle_id
    or new.maintenance_type_id is distinct from old.maintenance_type_id
    or new.suggestion_id is distinct from old.suggestion_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'immutable_column' using errcode = 'P0001';
  end if;

  v_kind := private.assert_type_applies(new.vehicle_id, new.maintenance_type_id);

  if v_kind = 'mechanical' and new.interval_km is null and new.interval_months is null then
    raise exception 'interval_required' using errcode = 'P0001';
  end if;

  if v_kind = 'legal' and (new.interval_km is not null or new.interval_months is not null) then
    raise exception 'legal_type_has_no_interval' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger maintenance_rules_before_write
before insert or update on public.maintenance_rules
for each row execute function private.maintenance_rules_before_write();
