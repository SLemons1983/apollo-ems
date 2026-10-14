#!/usr/bin/env bash
# Initializes the ApolloEMS STAGING database (Supabase project eejahcuftznsabulssew).
#
# Real run (password is asked for at a hidden prompt, never put in the command):
#   STAGING_DATABASE_URL='postgresql://postgres.eejahcuftznsabulssew@<session-pooler-host>:5432/postgres' \
#     scripts/apply-staging.sh
#
# Local rehearsal against a PostgreSQL server on this machine only:
#   scripts/apply-staging.sh --local-rehearsal 'postgresql://postgres@127.0.0.1:54317/apollo_rehearsal'
#
# Safety checks, all before anything is written:
#   1. The connection string is parsed; it must be a postgres URL whose user is
#      postgres.eejahcuftznsabulssew (session pooler) or whose host is
#      db.eejahcuftznsabulssew.supabase.co. The production ref is refused
#      anywhere in it. Passwords inside the URL are refused.
#   2. The target's public schema must be empty (a new project has no tables).
#   3. The plan (files and checksums) is shown and must be confirmed by typing
#      APPLY TO STAGING.
# Then each file runs in its own transaction, stopping at the first error, and
# the result is verified.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT/scripts/lib/staging-target.sh"

MODE="staging"
if [ "${1:-}" = "--local-rehearsal" ]; then
  staging_target rehearsal "${2:-}"
else
  staging_target staging "${STAGING_DATABASE_URL:-}"
fi

export PGOPTIONS="-c statement_timeout=120000 -c lock_timeout=30000"
export PGCONNECT_TIMEOUT=15
PSQL=(psql "$URL" -X -q -v ON_ERROR_STOP=1)

echo "Target: user=$db_user host=$db_host port=$db_port mode=$MODE"
echo "Server reports: $("${PSQL[@]}" -At -c "select current_database() || ' / PostgreSQL ' || current_setting('server_version')")"

existing="$("${PSQL[@]}" -At -c "select coalesce(string_agg(tablename, ', ' order by tablename), '') from pg_tables where schemaname = 'public'")"
[ -z "$existing" ] || fail "the target already has tables in its public schema ($existing). Staging setup only runs on an empty project."

FILES=("$ROOT/supabase/staging/001_reconstructed_base_schema.sql")
while IFS= read -r f; do FILES+=("$f"); done < <(ls "$ROOT"/supabase/migrations/*.sql | sort)
FILES+=("$ROOT/supabase/staging/002_staging_access_rules.sql" "$ROOT/supabase/staging/003_synthetic_seed.sql")

echo "Files to apply, in order:"
for f in "${FILES[@]}"; do echo "  ${f#$ROOT/}  sha256:$(sha256sum "$f" | cut -c1-12)"; done

if [ "$MODE" = "rehearsal" ] && [ "${APPLY_STAGING_CONFIRM:-}" = "APPLY TO STAGING" ]; then
  answer="APPLY TO STAGING"
else
  read -r -p "Type APPLY TO STAGING to continue: " answer
fi
[ "$answer" = "APPLY TO STAGING" ] || { echo "Cancelled. Nothing was changed."; exit 1; }

for f in "${FILES[@]}"; do
  echo "-> ${f#$ROOT/}"
  if grep -qiE '^[[:space:]]*(begin|start transaction)[[:space:]]*;' "$f"; then
    # The file manages its own transaction (begin; ... commit;). Wrapping it in
    # another one only produces nested-transaction warnings.
    "${PSQL[@]}" -f "$f"
  else
    "${PSQL[@]}" --single-transaction -f "$f"
  fi
done

echo "Verifying..."
"${PSQL[@]}" -At <<'SQL'
\pset fieldsep ' '
select 'tables in public: ' || count(*) from pg_tables where schemaname = 'public';
select 'tables without row-level security: ' || count(*) from pg_tables where schemaname = 'public' and not rowsecurity;
select 'restore function installed: ' || (to_regprocedure('public.restore_returned_timecard_rows(text,text,text,timestamptz,text,jsonb)') is not null);
select 'version columns present: ' || (count(*) = 5) from information_schema.columns
 where table_schema = 'public' and table_name = 'submitted_timecards'
   and column_name in ('version_number','parent_timecard_id','version_reason','created_by_role','created_by_employee_id');
select 'synthetic employees: ' || count(*) || ', non-synthetic emails: ' || count(*) filter (where email not like '%@example.test') from public.employees;
select 'submitted timecards: ' || count(*) from public.submitted_timecards;
SQL
echo "Staging database initialized ($MODE)."
