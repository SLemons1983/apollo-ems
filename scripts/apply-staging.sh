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

STAGING_REF="eejahcuftznsabulssew"
PRODUCTION_REF="xyrusrspvyuwpplhhett"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

fail() { echo "REFUSED: $*" >&2; exit 2; }

MODE="staging"
if [ "${1:-}" = "--local-rehearsal" ]; then
  MODE="rehearsal"
  URL="${2:-}"
else
  URL="${STAGING_DATABASE_URL:-}"
fi
[ -n "$URL" ] || fail "no connection string. Set STAGING_DATABASE_URL (staging project only)."

lower_url="$(printf '%s' "$URL" | tr '[:upper:]' '[:lower:]')"
case "$lower_url" in *"$PRODUCTION_REF"*) fail "the connection string refers to the PRODUCTION project ($PRODUCTION_REF)." ;; esac

# Parse the URL (scheme, user, password presence, host).
parsed="$(python3 - "$URL" <<'PY' || true
import sys
from urllib.parse import urlsplit
try:
    u = urlsplit(sys.argv[1])
    if u.scheme not in ("postgres", "postgresql") or not u.hostname:
        raise ValueError
    print(u.username or "", "yes" if u.password else "no", u.hostname.lower(), u.port or 5432, sep="\t")
except Exception:
    print("INVALID")
PY
)"
[ "$parsed" != "INVALID" ] && [ -n "$parsed" ] || fail "not a valid postgresql:// connection string."
IFS=$'\t' read -r db_user has_password db_host db_port <<<"$parsed"
[ "$has_password" = "no" ] || fail "do not put the password in the connection string; you will be prompted for it."

if [ "$MODE" = "rehearsal" ]; then
  case "$db_host" in 127.0.0.1|localhost|::1) ;; *) fail "--local-rehearsal only targets a PostgreSQL server on this machine." ;; esac
else
  if [ "$db_user" != "postgres.$STAGING_REF" ] && [ "$db_host" != "db.$STAGING_REF.supabase.co" ]; then
    fail "the connection must be to staging project $STAGING_REF (user postgres.$STAGING_REF via the session pooler, or host db.$STAGING_REF.supabase.co)."
  fi
  case "$db_host" in *.supabase.com|*.supabase.co) ;; *) fail "host $db_host is not a Supabase host." ;; esac
  [ "$db_port" != "6543" ] || fail "port 6543 is the transaction pooler; use the session pooler (port 5432)." 
  case "$lower_url" in *sslmode=*) ;; *) URL="$URL$([[ "$URL" == *\?* ]] && echo '&' || echo '?')sslmode=require" ;; esac
  if [ -z "${PGPASSWORD:-}" ]; then
    read -r -s -p "Staging database password (input hidden): " PGPASSWORD; echo
    export PGPASSWORD
  fi
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
  "${PSQL[@]}" --single-transaction -f "$f"
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
