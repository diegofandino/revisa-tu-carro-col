#!/usr/bin/env bash
# V3: two concurrent create_vehicle calls with room for only one -> exactly one succeeds.
# Runs against the LOCAL Supabase stack only (docker container of `supabase start`).
set -euo pipefail

CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_vehicle-maintenance-pwa}"
psql_db() { docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qtA "$@"; }

# Synthetic user (example.test); its account gets the default limit of 1.
USER_ID=$(psql_db -c "insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'concurrency-' || gen_random_uuid() || '@example.test', '', now(), '{}', '{}', now(), now()) returning id;" | head -1)
ACCOUNT_ID=$(psql_db -c "select account_id from public.account_members where user_id = '$USER_ID';")

cleanup() {
  psql_db -c "delete from public.accounts where id = '$ACCOUNT_ID'; delete from auth.users where id = '$USER_ID';" >/dev/null
}
trap cleanup EXIT

session() {
  psql_db <<SQL 2>&1
begin;
select set_config('request.jwt.claims', '{"sub":"$USER_ID","role":"authenticated"}', true);
set local role authenticated;
select public.create_vehicle('$ACCOUNT_ID', 'car', 'Concurrente $1', 1000);
select pg_sleep(1);
commit;
SQL
}

session A >/tmp/vehicle_limit_a.$$ & PID_A=$!
session B >/tmp/vehicle_limit_b.$$ & PID_B=$!
wait $PID_A || true
wait $PID_B || true

ACTIVE=$(psql_db -c "select count(*) from public.vehicles where account_id = '$ACCOUNT_ID' and archived_at is null;")
REJECTED=$(cat /tmp/vehicle_limit_a.$$ /tmp/vehicle_limit_b.$$ | grep -c "vehicle_limit_reached" || true)
rm -f /tmp/vehicle_limit_a.$$ /tmp/vehicle_limit_b.$$

if [[ "$ACTIVE" == "1" && "$REJECTED" == "1" ]]; then
  echo "ok - concurrent creates: 1 succeeded, 1 rejected with vehicle_limit_reached (V3)"
else
  echo "not ok - expected 1 active vehicle and 1 rejection, got active=$ACTIVE rejected=$REJECTED" >&2
  exit 1
fi
