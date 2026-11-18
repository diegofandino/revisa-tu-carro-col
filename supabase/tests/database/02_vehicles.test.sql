-- Account bootstrap, vehicles and vehicle limit (Spec 002 §3, §4, V1–V6).
begin;
\ir helpers.psql
select plan(17);

select tests.create_user('carla');

-- Bootstrap
select is((select count(*) from public.account_members where user_id = (select id from tests.users where name = 'carla')
  and role = 'owner'), 1::bigint, 'sign-up creates exactly one owner membership');
select is((select vehicle_limit from public.account_entitlements where account_id = tests.account_of('carla')), 1,
  'default vehicle limit is 1');

select tests.authenticate_as('carla');

-- V1
select public.create_vehicle(tests.account_of('carla'), 'car', '  Mi carro  ', 45000, p_plate => 'abc 123') as v1 \gset
select is((select alias from public.vehicles where id = :'v1'), 'Mi carro', 'alias is trimmed');
select is((select plate from public.vehicles where id = :'v1'), 'ABC123', 'plate is normalized (V4)');
select results_eq(
  format($$select km, reading_date, source::text from public.odometer_readings where vehicle_id = %L$$, :'v1'),
  $$values (45000, private.today_bogota(), 'manual')$$,
  'creating a vehicle creates its first reading dated today (V1)');

-- V2
select throws_ok(
  format($$select public.create_vehicle(%L, 'motorcycle', 'Moto', 1000)$$, tests.account_of('carla')),
  'P0001', 'vehicle_limit_reached', 'second active vehicle is rejected at limit 1 (V2)');
select is((select count(*) from public.vehicles), 1::bigint, 'nothing was created by the rejected call');

-- Archived vehicles do not count
update public.vehicles set archived_at = now() where id = :'v1';
select public.create_vehicle(tests.account_of('carla'), 'motorcycle', 'Moto', 1000) as v2 \gset
select ok(:'v2' is not null, 'after archiving, a new vehicle fits the limit');

-- V5
select throws_ok(format($$update public.vehicles set archived_at = null where id = %L$$, :'v1'),
  'P0001', 'vehicle_limit_reached', 'unarchiving beyond the limit is rejected (V5)');

reset role;
update public.account_entitlements set vehicle_limit = 2 where account_id = tests.account_of('carla');
select tests.authenticate_as('carla');
select lives_ok(format($$update public.vehicles set archived_at = null where id = %L$$, :'v1'),
  'unarchiving works once an administrator raises the limit');

-- V4 duplicate plate (normalized) in the same account
select throws_ok(format($$update public.vehicles set plate = 'ABC-123' where id = %L$$, :'v2'),
  '23505', null, 'duplicate plate in the same account is rejected (V4)');

-- V6 validation
select throws_ok(format($$update public.vehicles set alias = '   ' where id = %L$$, :'v2'),
  '23514', null, 'blank alias is rejected (V6)');
select throws_ok(format($$update public.vehicles set year = 1949 where id = %L$$, :'v2'),
  '23514', null, 'year 1949 is rejected (V6)');
select throws_ok(
  format($$update public.vehicles set year = %s where id = %L$$,
    extract(year from private.today_bogota())::int + 2, :'v2'),
  'P0001', 'year_out_of_range', 'year current+2 is rejected (V6)');
select lives_ok(
  format($$update public.vehicles set year = %s where id = %L$$,
    extract(year from private.today_bogota())::int + 1, :'v2'),
  'year current+1 is accepted');
select throws_ok(format($$update public.vehicles set plate = 'AB' where id = %L$$, :'v2'),
  '23514', null, 'too-short plate is rejected');

-- Archive is audited
select is((select action from public.audit_log where record_id = :'v1' order by id limit 1), 'archive',
  'archiving a vehicle is recorded in the audit log');
reset role;

select * from finish();
rollback;
