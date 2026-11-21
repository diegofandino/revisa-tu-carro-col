#!/usr/bin/env bash
# Runs a command with NEXT_PUBLIC_SUPABASE_* pointing at the LOCAL Supabase stack (`supabase start`).
# Never prints the keys. Usage: scripts/with-local-supabase.sh <command> [args...]
set -euo pipefail

STATUS=$(supabase status -o env 2>/dev/null) || {
  echo "Local Supabase is not running. Start it with: supabase start" >&2
  exit 1
}

value() { printf '%s\n' "$STATUS" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" | head -1; }

NEXT_PUBLIC_SUPABASE_URL=$(value API_URL)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(value PUBLISHABLE_KEY)
MAILPIT_URL=$(value MAILPIT_URL)

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ]]; then
  echo "Could not read the local Supabase URL/key from 'supabase status'." >&2
  exit 1
fi

export NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:54324}"
exec "$@"
