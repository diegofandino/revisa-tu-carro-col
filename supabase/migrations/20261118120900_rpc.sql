-- RPC: create a vehicle and its first reading atomically. SECURITY INVOKER: RLS, grants and
-- triggers apply exactly as for direct writes. Spec 003 §6.

create function public.create_vehicle(
  p_account_id uuid,
  p_class public.vehicle_class,
  p_alias text,
  p_current_km integer,
  p_brand text default null,
  p_model text default null,
  p_year smallint default null,
  p_plate text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_vehicle_id uuid;
begin
  insert into public.vehicles (account_id, class, alias, brand, model, year, plate)
  values (p_account_id, p_class, p_alias, p_brand, p_model, p_year, p_plate)
  returning id into v_vehicle_id;

  insert into public.odometer_readings (account_id, vehicle_id, km)
  values (p_account_id, v_vehicle_id, p_current_km);

  return v_vehicle_id;
end;
$$;

revoke execute on function public.create_vehicle(uuid, public.vehicle_class, text, integer, text, text, smallint, text)
  from public, anon;
grant execute on function public.create_vehicle(uuid, public.vehicle_class, text, integer, text, text, smallint, text)
  to authenticated;
