-- Account isolation and privilege tests (Spec 002 A1–A5, Spec 003 §7).
begin;
\ir helpers.psql
select plan(26);

select tests.create_user('alice');
select tests.create_user('bob');

-- Alice's data, created as Alice.
select tests.authenticate_as('alice');
select public.create_vehicle(tests.account_of('alice'), 'car', 'Carro de Alice', 20000) as alice_vehicle \gset
insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_km)
  select tests.account_of('alice'), :'alice_vehicle', id, 5000 from public.maintenance_types where code = 'oil_change';
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km)
  select tests.account_of('alice'), :'alice_vehicle', id, private.today_bogota(), 20000
  from public.maintenance_types where code = 'oil_change';
update public.accounts set name = 'Cuenta Alice' where id = tests.account_of('alice');
reset role;

-- ---------- Bob cannot see Alice's data ----------
select tests.authenticate_as('bob');
select is((select count(*) from public.vehicles), 0::bigint, 'B sees no vehicles of A');
select is((select count(*) from public.odometer_readings), 0::bigint, 'B sees no readings of A');
select is((select count(*) from public.maintenance_rules), 0::bigint, 'B sees no rules of A');
select is((select count(*) from public.service_records), 0::bigint, 'B sees no service records of A');
select is((select count(*) from public.audit_log), 0::bigint, 'B sees no audit entries of A');
select is((select count(*) from public.accounts), 1::bigint, 'B sees only its own account');
select is((select count(*) from public.account_entitlements), 1::bigint, 'B sees only its own entitlement');
select is((select count(*) from public.account_members), 1::bigint, 'B sees only its own membership');
select ok((select count(*) from public.maintenance_types) > 0, 'catalog is readable by authenticated users');

-- ---------- Bob cannot write into Alice's account ----------
select throws_ok(
  format($$select public.create_vehicle(%L, 'car', 'Intruso', 1000)$$, tests.account_of('alice')),
  '42501', null, 'B cannot create a vehicle in A''s account');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, km) values (%L, %L, 99999)$$,
    tests.account_of('alice'), :'alice_vehicle'),
  '42501', null, 'B cannot add a reading to A''s vehicle');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, km) values (%L, %L, 99999)$$,
    tests.account_of('bob'), :'alice_vehicle'),
  '23503', null, 'B cannot attach a reading to A''s vehicle under B''s account (composite FK)');
select throws_ok(
  format($$insert into public.maintenance_rules (account_id, vehicle_id, maintenance_type_id, interval_km)
    select %L, %L, id, 1000 from public.maintenance_types where code = 'tires'$$,
    tests.account_of('alice'), :'alice_vehicle'),
  'P0001', 'vehicle_not_found', 'B cannot create a rule on A''s vehicle');
select is(
  tests.rows_affected(format($$update public.vehicles set alias = 'Hackeado' where id = %L$$, :'alice_vehicle')),
  0, 'B updating A''s vehicle affects no rows');
select is(
  tests.rows_affected($$update public.service_records set voided_at = now(), void_reason = 'intento B'$$),
  0, 'B cannot void A''s service records');
select is(
  tests.rows_affected(format($$update public.accounts set name = 'X' where id = %L$$, tests.account_of('alice'))),
  0, 'B cannot rename A''s account');

-- ---------- Privileges: tampering with protected columns/tables ----------
select throws_ok($$update public.account_entitlements set vehicle_limit = 100$$, '42501', null,
  'users cannot change their vehicle limit');
select throws_ok($$insert into public.audit_log (account_id, table_name, record_id, action, old_data, new_data)
  values (gen_random_uuid(), 'x', gen_random_uuid(), 'update', '{}', '{}')$$, '42501', null,
  'users cannot write the audit log');
select throws_ok($$delete from public.vehicles$$, '42501', null, 'users cannot hard-delete vehicles');
select throws_ok($$insert into public.maintenance_types (code, name_es, kind, applies_to)
  values ('fake', 'Fake', 'mechanical', '{car}')$$, '42501', null, 'users cannot change the catalog');
reset role;

select tests.authenticate_as('alice');
select throws_ok(
  format($$update public.vehicles set account_id = %L where id = %L$$, tests.account_of('bob'), :'alice_vehicle'),
  '42501', null, 'owner cannot move a vehicle to another account');
select throws_ok(
  format($$insert into public.odometer_readings (account_id, vehicle_id, km, source)
    values (%L, %L, 30000, 'service')$$, tests.account_of('alice'), :'alice_vehicle'),
  '42501', null, 'users cannot create service-sourced readings directly');
select is((select alias from public.vehicles where id = :'alice_vehicle'), 'Carro de Alice',
  'A''s vehicle is unchanged after B''s attempts');
reset role;

-- ---------- Anonymous ----------
set local role anon;
select throws_ok($$select * from public.vehicles$$, '42501', null, 'anon cannot read vehicles');
select throws_ok(
  format($$select public.create_vehicle(%L, 'car', 'Anon', 1)$$, gen_random_uuid()),
  '42501', null, 'anon cannot call create_vehicle');
select throws_ok($$select * from public.maintenance_types$$, '42501', null, 'anon cannot read the catalog');
reset role;

select * from finish();
rollback;
