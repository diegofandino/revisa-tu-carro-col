-- Deny by default, then grant exactly the matrix in Spec 003 §7.3 (column-level UPDATE/INSERT).

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- accounts
grant select on public.accounts to authenticated;
grant update (name) on public.accounts to authenticated;
-- account_members / account_entitlements: read only
grant select on public.account_members to authenticated;
grant select on public.account_entitlements to authenticated;
-- vehicles
grant select on public.vehicles to authenticated;
grant insert (account_id, class, alias, brand, model, year, plate) on public.vehicles to authenticated;
grant update (class, alias, brand, model, year, plate, archived_at) on public.vehicles to authenticated;
-- catalog
grant select on public.maintenance_types to authenticated;
grant select on public.interval_suggestions to authenticated;
-- odometer_readings (source is not grantable on insert: users can only create manual readings)
grant select on public.odometer_readings to authenticated;
grant insert (account_id, vehicle_id, reading_date, km) on public.odometer_readings to authenticated;
grant update (km, reading_date, deleted_at, correction_reason) on public.odometer_readings to authenticated;
-- maintenance_rules
grant select on public.maintenance_rules to authenticated;
grant insert (account_id, vehicle_id, maintenance_type_id, interval_km, interval_months, suggestion_id)
  on public.maintenance_rules to authenticated;
grant update (interval_km, interval_months, archived_at) on public.maintenance_rules to authenticated;
-- service_records
grant select on public.service_records to authenticated;
grant insert (account_id, vehicle_id, maintenance_type_id, service_date, km, expires_on, cost_cop, workshop, notes,
  is_approximate) on public.service_records to authenticated;
grant update (voided_at, void_reason) on public.service_records to authenticated;
-- audit_log: read only
grant select on public.audit_log to authenticated;

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.account_entitlements enable row level security;
alter table public.vehicles enable row level security;
alter table public.maintenance_types enable row level security;
alter table public.interval_suggestions enable row level security;
alter table public.odometer_readings enable row level security;
alter table public.maintenance_rules enable row level security;
alter table public.service_records enable row level security;
alter table public.audit_log enable row level security;

create policy accounts_select on public.accounts for select to authenticated
  using (private.is_member(id));
create policy accounts_update on public.accounts for update to authenticated
  using (private.is_owner(id)) with check (private.is_owner(id));

create policy account_members_select on public.account_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy account_entitlements_select on public.account_entitlements for select to authenticated
  using (private.is_member(account_id));

create policy vehicles_select on public.vehicles for select to authenticated
  using (private.is_member(account_id));
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (private.is_member(account_id));
create policy vehicles_update on public.vehicles for update to authenticated
  using (private.is_member(account_id)) with check (private.is_member(account_id));

create policy maintenance_types_select on public.maintenance_types for select to authenticated
  using (true);
create policy interval_suggestions_select on public.interval_suggestions for select to authenticated
  using (true);

create policy odometer_readings_select on public.odometer_readings for select to authenticated
  using (private.is_member(account_id));
create policy odometer_readings_insert on public.odometer_readings for insert to authenticated
  with check (private.is_member(account_id) and source = 'manual');
create policy odometer_readings_update on public.odometer_readings for update to authenticated
  using (private.is_member(account_id)) with check (private.is_member(account_id));

create policy maintenance_rules_select on public.maintenance_rules for select to authenticated
  using (private.is_member(account_id));
create policy maintenance_rules_insert on public.maintenance_rules for insert to authenticated
  with check (private.is_member(account_id));
create policy maintenance_rules_update on public.maintenance_rules for update to authenticated
  using (private.is_member(account_id)) with check (private.is_member(account_id));

create policy service_records_select on public.service_records for select to authenticated
  using (private.is_member(account_id));
create policy service_records_insert on public.service_records for insert to authenticated
  with check (private.is_member(account_id));
create policy service_records_update on public.service_records for update to authenticated
  using (private.is_member(account_id)) with check (private.is_member(account_id));

create policy audit_log_select on public.audit_log for select to authenticated
  using (private.is_member(account_id));
