#!/usr/bin/env bash
# Deletes the synthetic e2e users (*@example.test) and their data from the LOCAL Supabase stack only.
# Never touches the hosted project: it talks to the local Docker container directly.
set -euo pipefail

CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_vehicle-maintenance-pwa}"
if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "cleanup skipped: local container $CONTAINER not running" >&2
  exit 0
fi

docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -qtA <<'SQL'
begin;
create temporary table test_accounts on commit drop as
  select m.account_id from public.account_members m join auth.users u on u.id = m.user_id
  where u.email like '%@example.test';
delete from public.audit_log where account_id in (select account_id from test_accounts);
delete from public.accounts where id in (select account_id from test_accounts);
with deleted as (delete from auth.users where email like '%@example.test' returning 1)
select 'deleted test users: ' || count(*) from deleted;
commit;
SQL
