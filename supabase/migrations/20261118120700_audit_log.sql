-- Append-only audit trail for corrections, voids and archives. Spec 003 §5.10.

create table public.audit_log (
  id bigint generated always as identity primary key,
  account_id uuid not null,
  actor_id uuid,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('update', 'delete', 'void', 'archive')),
  old_data jsonb not null,
  new_data jsonb not null,
  created_at timestamptz not null default now()
);

create index audit_log_account_created_idx on public.audit_log (account_id, created_at desc);

-- Runs after the row passed RLS; writes only the changed columns.
create function private.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_old_changed jsonb := '{}'::jsonb;
  v_new_changed jsonb := '{}'::jsonb;
  v_key text;
  v_action text := 'update';
begin
  for v_key in select jsonb_object_keys(v_new) loop
    if v_key <> 'updated_at' and (v_old -> v_key) is distinct from (v_new -> v_key) then
      v_old_changed := v_old_changed || jsonb_build_object(v_key, v_old -> v_key);
      v_new_changed := v_new_changed || jsonb_build_object(v_key, v_new -> v_key);
    end if;
  end loop;

  if v_new_changed = '{}'::jsonb then
    return null;
  end if;

  if v_new ? 'voided_at' and v_old ->> 'voided_at' is null and v_new ->> 'voided_at' is not null then
    v_action := 'void';
  elsif v_new ? 'deleted_at' and v_old ->> 'deleted_at' is null and v_new ->> 'deleted_at' is not null then
    v_action := 'delete';
  elsif v_new ? 'archived_at' and v_old ->> 'archived_at' is null and v_new ->> 'archived_at' is not null then
    v_action := 'archive';
  end if;

  insert into public.audit_log (account_id, actor_id, table_name, record_id, action, old_data, new_data)
  values ((v_new ->> 'account_id')::uuid, auth.uid(), tg_table_name, (v_new ->> 'id')::uuid, v_action, v_old_changed, v_new_changed);

  return null;
end;
$$;

revoke execute on function private.audit_changes() from public;

create trigger vehicles_audit after update on public.vehicles
for each row execute function private.audit_changes();
create trigger odometer_readings_audit after update on public.odometer_readings
for each row execute function private.audit_changes();
create trigger maintenance_rules_audit after update on public.maintenance_rules
for each row execute function private.audit_changes();
create trigger service_records_audit after update on public.service_records
for each row execute function private.audit_changes();
