-- Latest non-voided service per vehicle and maintenance type: the baseline of each rule (Spec 001 §4,
-- task 010). One row per (vehicle, type), so the dashboard never downloads the whole history.
--
-- security_invoker: the caller's privileges and the RLS of service_records apply, so a user only
-- sees rows of accounts they belong to (a definer view would bypass RLS).

create view public.latest_service_records
with (security_invoker = true)
as
select distinct on (s.vehicle_id, s.maintenance_type_id)
  s.id,
  s.account_id,
  s.vehicle_id,
  s.maintenance_type_id,
  s.service_date,
  s.km,
  s.expires_on,
  s.is_approximate
from public.service_records s
where s.voided_at is null
order by s.vehicle_id, s.maintenance_type_id, s.service_date desc, s.created_at desc, s.id desc;

comment on view public.latest_service_records is
  'Baseline per rule: most recent non-voided service per vehicle and type. Invoker rights (RLS applies).';

-- Deny by default; read-only for signed-in users.
revoke all on public.latest_service_records from public, anon, authenticated;
grant select on public.latest_service_records to authenticated;
