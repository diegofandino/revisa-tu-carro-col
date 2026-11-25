-- View latest_service_records (task 010): baseline per rule, voided services skipped, RLS through the view.
begin;
\ir helpers.psql
select plan(11);

select tests.create_user('sara');
select tests.create_user('tomas');

select tests.authenticate_as('sara');
select tests.account_of('sara') as acct \gset
select public.create_vehicle(:'acct', 'car', 'Carro', 10000) as v \gset
select id as oil from public.maintenance_types where code = 'oil_change' \gset
select id as soat from public.maintenance_types where code = 'soat' \gset

-- Two oil services on different days, then a newer one that gets voided; one SOAT.
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km)
values (:'acct', :'v', :'oil', private.today_bogota() - 60, 5000);
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km, is_approximate)
values (:'acct', :'v', :'oil', private.today_bogota() - 30, 7000, true);
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km)
values (:'acct', :'v', :'oil', private.today_bogota() - 5, 9000)
returning id as voided \gset
update public.service_records set voided_at = now(), void_reason = 'Registro equivocado' where id = :'voided';
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, expires_on)
values (:'acct', :'v', :'soat', private.today_bogota() - 10, private.today_bogota() + 355);

select is((select count(*) from public.latest_service_records), 2::bigint, 'one row per vehicle and type');
select results_eq(
  format($$select km, is_approximate from public.latest_service_records where vehicle_id = %L and maintenance_type_id = %L$$, :'v', :'oil'),
  $$values (7000, true)$$,
  'the voided newer service is skipped; the previous one is the baseline');
select is(
  (select expires_on from public.latest_service_records where maintenance_type_id = :'soat'),
  private.today_bogota() + 355, 'legal baseline carries the expiry date');

-- A newer active service replaces the baseline. (Same-day ties are broken by created_at, which is
-- constant inside one test transaction, so that case is not asserted here.)
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km)
values (:'acct', :'v', :'oil', private.today_bogota() - 2, 9500);
select results_eq(
  format($$select km, is_approximate from public.latest_service_records where maintenance_type_id = %L$$, :'oil'),
  $$values (9500, false)$$,
  'a newer active service becomes the baseline');

-- Voiding every oil service leaves no baseline (rule shows "Sin registro").
update public.service_records set voided_at = now(), void_reason = 'Registro equivocado'
where maintenance_type_id = :'oil' and voided_at is null;
select is(
  (select count(*) from public.latest_service_records where maintenance_type_id = :'oil'),
  0::bigint, 'with all services voided there is no baseline');

-- Isolation: another account sees nothing through the view.
select tests.authenticate_as('tomas');
select is((select count(*) from public.latest_service_records), 0::bigint, 'another user sees no rows (RLS)');
select is(
  (select count(*) from public.latest_service_records where vehicle_id = :'v'),
  0::bigint, 'another user cannot read a known vehicle id through the view');
select throws_ok(
  format($$update public.latest_service_records set km = 1 where vehicle_id = %L$$, :'v'),
  '55000', null, 'the view is not updatable (DISTINCT ON), so it is read-only');
reset role;

-- Anonymous: no access at all.
set local role anon;
select throws_ok('select * from public.latest_service_records', '42501', null, 'anon cannot read the view');
reset role;

-- The view runs with the caller's rights (otherwise it would bypass RLS).
select ok(
  (select 'security_invoker=true' = any (c.reloptions) from pg_class c where c.oid = 'public.latest_service_records'::regclass),
  'the view is security_invoker');
select ok(
  not has_table_privilege('authenticated', 'public.latest_service_records', 'INSERT, UPDATE, DELETE'),
  'authenticated has no write privileges on the view');

select * from finish();
rollback;
