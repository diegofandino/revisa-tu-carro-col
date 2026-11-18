-- Odometer readings: monotonic history, same-day replacement, corrections (Spec 002 R1–R5).
begin;
\ir helpers.psql
select plan(19);

select tests.create_user('dario');
select tests.authenticate_as('dario');
select public.create_vehicle(tests.account_of('dario'), 'car', 'Carro', 50000) as v \gset
select tests.account_of('dario') as acct \gset

-- Seed history (past dates) below today's 50,000.
insert into public.odometer_readings (account_id, vehicle_id, reading_date, km)
values (:'acct', :'v', '2026-01-01', 10000), (:'acct', :'v', '2026-03-01', 12000);

-- R1
select lives_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, reading_date, km) values (%L, %L, '2026-02-01', 11000)$$, :'acct', :'v'),
  'a value between earlier and later readings is accepted (R1)');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, reading_date, km) values (%L, %L, '2026-02-02', 9000)$$, :'acct', :'v'),
  'P0001', 'reading_lower_than_previous', 'a value lower than an earlier reading is rejected (R1)');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, reading_date, km) values (%L, %L, '2026-02-02', 13000)$$, :'acct', :'v'),
  'P0001', 'reading_higher_than_later', 'a value higher than a later reading is rejected (R1)');

-- R2 same day
select lives_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, km) values (%L, %L, 50500)$$, :'acct', :'v'),
  'a higher value today is accepted (R2)');
select is(
  (select count(*) from public.odometer_readings
   where vehicle_id = :'v' and reading_date = private.today_bogota() and deleted_at is null),
  1::bigint, 'the higher same-day value replaces the previous one (R2)');
select is(
  (select correction_reason from public.odometer_readings where vehicle_id = :'v' and km = 50000),
  'superseded', 'the replaced reading is kept as superseded');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, km) values (%L, %L, 50400)$$, :'acct', :'v'),
  'P0001', 'reading_not_higher_same_day', 'a lower value today is rejected (R2)');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, km) values (%L, %L, 50500)$$, :'acct', :'v'),
  'P0001', 'reading_not_higher_same_day', 'an equal manual value today is rejected (R2)');

-- R3
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, reading_date, km) values (%L, %L, private.today_bogota() + 1, 60000)$$, :'acct', :'v'),
  'P0001', 'date_in_future', 'a future date is rejected (R3)');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, reading_date, km) values (%L, %L, '2025-01-01', -1)$$, :'acct', :'v'),
  '23514', null, 'negative km is rejected (R3)');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, km) values (%L, %L, 2000001)$$, :'acct', :'v'),
  '23514', null, 'km above 2,000,000 is rejected (R3)');

-- R4 corrections
select id as feb from public.odometer_readings where vehicle_id = :'v' and km = 11000 \gset
select throws_ok(format($$update public.odometer_readings set km = 11500 where id = %L$$, :'feb'),
  'P0001', 'correction_reason_required', 'a correction without a reason is rejected (R4)');
select lives_ok(
  format($$update public.odometer_readings set km = 11500, correction_reason = 'Error de digitación' where id = %L$$, :'feb'),
  'a correction with a reason is accepted (R4)');
select results_eq(
  format($$select action, old_data ->> 'km', new_data ->> 'km' from public.audit_log where record_id = %L$$, :'feb'),
  $$values ('update', '11000', '11500')$$,
  'the correction is in the audit log with old and new values (R4)');
select throws_ok(
  format($$update public.odometer_readings set km = 12500, correction_reason = 'Otro ajuste' where id = %L$$, :'feb'),
  'P0001', 'reading_higher_than_later', 'a correction must keep the history monotonic');
select lives_ok(
  format($$update public.odometer_readings set deleted_at = now(), correction_reason = 'Lectura duplicada' where id = %L$$, :'feb'),
  'a reading can be soft-deleted with a reason');
select throws_ok(
  format($$update public.odometer_readings set deleted_at = null, correction_reason = 'Restaurar lectura' where id = %L$$, :'feb'),
  'P0001', 'reading_deleted', 'deleted readings cannot be restored or edited');

-- R5 last reading
reset role;
update public.account_entitlements set vehicle_limit = 5 where account_id = tests.account_of('dario');
select tests.authenticate_as('dario');
select public.create_vehicle(tests.account_of('dario'), 'motorcycle', 'Moto', 100) as v3 \gset
select throws_ok(
  format($$update public.odometer_readings set deleted_at = now(), correction_reason = 'Borrar la única' where vehicle_id = %L$$, :'v3'),
  'P0001', 'last_reading', 'the only reading of a vehicle cannot be deleted (R5)');

-- R5 service-sourced readings
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km)
  select :'acct', :'v3', id, private.today_bogota(), 150 from public.maintenance_types where code = 'oil_change';
select throws_ok(
  format($$update public.odometer_readings set km = 160, correction_reason = 'Cambiar servicio' where vehicle_id = %L and source = 'service'$$, :'v3'),
  'P0001', 'service_reading_immutable', 'a service-sourced reading cannot be edited directly (R5)');
reset role;

select * from finish();
rollback;
