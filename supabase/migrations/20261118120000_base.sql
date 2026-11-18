-- Base: private schema for helpers, enums, shared trigger functions.
-- Spec 003 §3.

create schema if not exists private;
revoke all on schema private from public;
-- Needed so RLS policies (evaluated as the caller) can call private helpers.
grant usage on schema private to authenticated;

create type public.vehicle_class as enum ('car', 'motorcycle');
create type public.member_role as enum ('owner');
create type public.maintenance_kind as enum ('mechanical', 'legal');
create type public.reading_source as enum ('manual', 'service');

-- "Today" for the business always means Colombia.
create function private.today_bogota()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Function EXECUTE is granted to PUBLIC by default; deny by default instead.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;
revoke execute on all functions in schema private from public;
grant execute on function private.today_bogota() to authenticated, service_role;
