-- Vehicles, normalization, immutable columns and the per-account vehicle limit.
-- Spec 003 §5.4, invariants I2, I3, I11.

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  class public.vehicle_class not null,
  alias text not null check (char_length(alias) between 1 and 50),
  brand text check (brand is null or char_length(brand) between 1 and 50),
  model text check (model is null or char_length(model) between 1 and 50),
  year smallint check (year is null or year >= 1950),
  plate text check (plate is null or plate ~ '^[A-Z0-9]{5,7}$'),
  archived_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for composite FKs so child rows always share the vehicle's account (I1).
  unique (id, account_id)
);

create unique index vehicles_account_plate_key on public.vehicles (account_id, plate) where plate is not null;
create index vehicles_account_active_idx on public.vehicles (account_id) where archived_at is null;

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function private.set_updated_at();

-- Normalizes text and enforces rules that CHECK constraints cannot express.
create function private.vehicles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.account_id is distinct from old.account_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'immutable_column' using errcode = 'P0001';
  end if;

  new.alias := btrim(new.alias);
  new.brand := nullif(btrim(new.brand), '');
  new.model := nullif(btrim(new.model), '');
  new.plate := nullif(upper(regexp_replace(coalesce(new.plate, ''), '[[:space:]-]', '', 'g')), '');

  if new.year is not null and new.year > extract(year from private.today_bogota())::int + 1 then
    raise exception 'year_out_of_range' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger vehicles_before_write
before insert or update on public.vehicles
for each row execute function private.vehicles_before_write();

-- I3: active vehicles <= vehicle_limit. Runs as the caller (RLS applies), so a non-member
-- sees nothing here and is then rejected by the INSERT policy without learning anything.
-- The advisory lock serializes concurrent inserts/unarchives for the same account.
create function private.enforce_vehicle_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limit integer;
  v_active integer;
begin
  if new.archived_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.archived_at is null then
    return new;
  end if;
  -- Non-members are rejected by RLS right after this trigger; don't give them a misleading error.
  -- (Service role has no auth.uid(); trusted admin writes are not limited.)
  if not private.is_member(new.account_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vehicle_limit:' || new.account_id::text, 0));

  select e.vehicle_limit into v_limit
  from public.account_entitlements e
  where e.account_id = new.account_id;

  select count(*) into v_active
  from public.vehicles v
  where v.account_id = new.account_id
    and v.archived_at is null
    and v.id <> new.id;

  if v_active >= coalesce(v_limit, 0) then
    raise exception 'vehicle_limit_reached'
      using errcode = 'P0001', detail = format('limit=%s', coalesce(v_limit, 0));
  end if;

  return new;
end;
$$;

create trigger vehicles_enforce_limit
before insert or update of archived_at on public.vehicles
for each row execute function private.enforce_vehicle_limit();
