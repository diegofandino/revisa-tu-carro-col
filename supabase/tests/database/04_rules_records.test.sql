-- Maintenance rules and service records (Spec 002 M1–M4, S1–S3, legal documents).
begin;
\ir helpers.psql
select plan(22);

select tests.create_user('elena');
select tests.authenticate_as('elena');
select tests.account_of('elena') as acct \gset
select public.create_vehicle(:'acct', 'car', 'Carro', 30000) as v \gset
select id as oil from public.maintenance_types where code = 'oil_change' \gset
select id as tires from public.maintenance_types where code = 'tires' \gset
select id as brakes from public.maintenance_types where code = 'brake_fluid' \gset
select id as chain from public.maintenance_types where code = 'chain_kit' \gset
select id as soat from public.maintenance_types where code = 'soat' \gset

-- M1
select throws_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id) values (%L, %L, %L)$$, :'acct', :'v', :'oil'),
  'P0001', 'interval_required', 'a mechanical rule without intervals is rejected (M1)');
select lives_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_km) values (%L, %L, %L, 5000)$$, :'acct', :'v', :'oil'),
  'km-only rule is accepted (M1)');
select lives_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_months) values (%L, %L, %L, 24)$$, :'acct', :'v', :'brakes'),
  'months-only rule is accepted (M1)');
select lives_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_km, interval_months) values (%L, %L, %L, 40000, 48)$$, :'acct', :'v', :'tires'),
  'km + months rule is accepted (M1)');
select throws_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_km) values (%L, %L, %L, 50)$$, :'acct', :'v', :'tires'),
  '23514', null, 'interval below 100 km is rejected');

-- M2 / M4
select throws_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_km) values (%L, %L, %L, 6000)$$, :'acct', :'v', :'oil'),
  '23505', null, 'a second active rule for the same type is rejected (M2)');
select throws_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_km) values (%L, %L, %L, 20000)$$, :'acct', :'v', :'chain'),
  'P0001', 'type_not_applicable', 'a motorcycle-only type cannot be used on a car (M4)');

-- Legal types
select throws_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_months) values (%L, %L, %L, 12)$$, :'acct', :'v', :'soat'),
  'P0001', 'legal_type_has_no_interval', 'legal rules store no interval');
select lives_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id) values (%L, %L, %L)$$, :'acct', :'v', :'soat'),
  'legal rule without interval is accepted');

-- S1 atomicity
select throws_ok(
  format($$insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km) values (%L, %L, %L, private.today_bogota(), 29000)$$, :'acct', :'v', :'oil'),
  'P0001', 'reading_not_higher_same_day', 'a service whose km breaks the history is rejected (S1)');
select is((select count(*) from public.service_records), 0::bigint, 'the rejected service left nothing behind (S1)');
select lives_ok(
  format($$insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km, workshop) values (%L, %L, %L, private.today_bogota(), 30000, '  Taller Central ')$$, :'acct', :'v', :'oil'),
  'a service with the same km as today''s manual reading is accepted');
select id as rec from public.service_records where vehicle_id = :'v' \gset
select results_eq(
  format($$select km, source::text from public.odometer_readings where vehicle_id = %L and deleted_at is null$$, :'v'),
  $$values (30000, 'manual'), (30000, 'service')$$,
  'a service may equal today''s manual reading; both stay in the history (S1)');
select is((select workshop from public.service_records where id = :'rec'), 'Taller Central', 'workshop is trimmed');

-- S2 immutability and voiding
select throws_ok(format($$update public.service_records set notes = 'cambio' where id = %L$$, :'rec'),
  '42501', null, 'service record fields cannot be edited (S2)');
select throws_ok(format($$update public.service_records set voided_at = now() where id = %L$$, :'rec'),
  '23514', null, 'voiding requires a reason (S2)');
select lives_ok(
  format($$update public.service_records set voided_at = now(), void_reason = 'Registro equivocado' where id = %L$$, :'rec'),
  'a service record can be voided with a reason (S2)');
select is(
  (select count(*) from public.odometer_readings where service_record_id = :'rec' and deleted_at is null),
  0::bigint, 'voiding removes the service reading from calculations (S2)');
select is((select count(*) from public.odometer_readings where vehicle_id = :'v' and deleted_at is null), 1::bigint,
  'the manual history remains after voiding');
select throws_ok(
  format($$update public.service_records set voided_at = now(), void_reason = 'Otra vez' where id = %L$$, :'rec'),
  'P0001', 'service_record_voided', 'a voided record cannot be changed again (S2)');

-- Legal and mechanical field rules
select throws_ok(
  format($$insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date) values (%L, %L, %L, '2026-06-01')$$, :'acct', :'v', :'soat'),
  'P0001', 'legal_requires_expiry', 'SOAT requires an expiry date');
select throws_ok(
  format($$insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date) values (%L, %L, %L, '2026-06-01')$$, :'acct', :'v', :'tires'),
  'P0001', 'mechanical_requires_km', 'mechanical services require km');
reset role;

select * from finish();
rollback;
