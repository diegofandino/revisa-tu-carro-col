-- State-change timestamps are server-controlled (review fix 20261119090000).
begin;
\ir helpers.psql
select plan(4);

select tests.create_user('fabio');
select tests.authenticate_as('fabio');
select tests.account_of('fabio') as acct \gset
select public.create_vehicle(:'acct', 'car', 'Carro', 1000) as v \gset
insert into public.service_records (account_id, vehicle_id, maintenance_type_id, service_date, km)
  select :'acct', :'v', id, private.today_bogota(), 1200 from public.maintenance_types where code = 'oil_change';
select id as rec from public.service_records where vehicle_id = :'v' \gset

update public.service_records set voided_at = '2020-01-01', void_reason = 'Fecha falsa' where id = :'rec';
select ok((select voided_at > now() - interval '1 minute' from public.service_records where id = :'rec'),
  'a back-dated void is stamped with the server time');

update public.vehicles set archived_at = '2020-01-01' where id = :'v';
select ok((select archived_at > now() - interval '1 minute' from public.vehicles where id = :'v'),
  'a back-dated archive is stamped with the server time');
select archived_at as first_archive from public.vehicles where id = :'v' \gset
update public.vehicles set archived_at = '2030-01-01' where id = :'v';
select is((select archived_at::text from public.vehicles where id = :'v'), :'first_archive',
  'an existing archive time cannot be rewritten');

insert into public.odometer_readings (account_id, vehicle_id, reading_date, km) values (:'acct', :'v', '2025-01-01', 500);
update public.odometer_readings set deleted_at = '2020-01-01', correction_reason = 'Lectura repetida'
  where vehicle_id = :'v' and km = 500;
select ok((select deleted_at > now() - interval '1 minute' from public.odometer_readings where vehicle_id = :'v' and km = 500),
  'a back-dated deletion is stamped with the server time');
reset role;

select * from finish();
rollback;
