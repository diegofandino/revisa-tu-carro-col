-- Review fix: state-change timestamps (archived/deleted/voided) are set by the server, not the client.
-- Without this a user could back-date a void or archive, which weakens the audit trail.
-- Triggers named "*_a_server_time" sort first, so later triggers and the audit see the final value.

create function private.stamp_archived_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived_at is not null then
    new.archived_at := case when tg_op = 'UPDATE' and old.archived_at is not null then old.archived_at else now() end;
  end if;
  return new;
end;
$$;

create function private.stamp_deleted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    new.deleted_at := case when tg_op = 'UPDATE' and old.deleted_at is not null then old.deleted_at else now() end;
  end if;
  return new;
end;
$$;

create function private.stamp_voided_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.voided_at is not null then
    new.voided_at := case when tg_op = 'UPDATE' and old.voided_at is not null then old.voided_at else now() end;
  end if;
  return new;
end;
$$;

revoke execute on function private.stamp_archived_at(), private.stamp_deleted_at(), private.stamp_voided_at() from public;

create trigger vehicles_a_server_time before insert or update on public.vehicles
for each row execute function private.stamp_archived_at();
create trigger maintenance_rules_a_server_time before insert or update on public.maintenance_rules
for each row execute function private.stamp_archived_at();
create trigger odometer_readings_a_server_time before insert or update on public.odometer_readings
for each row execute function private.stamp_deleted_at();
create trigger service_records_a_server_time before insert or update on public.service_records
for each row execute function private.stamp_voided_at();
