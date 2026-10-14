#!/usr/bin/env bash
# Links your Google login(s) to SYNTHETIC test profiles in the ApolloEMS
# STAGING database, so you can sign in to the staging app.
#
#   STAGING_DATABASE_URL='postgresql://postgres.eejahcuftznsabulssew@<session-pooler-host>:5432/postgres' \
#     scripts/add-staging-tester.sh
#
# You are asked for:
#   * the Google email to act as a SUPERVISOR  -> profile "Staging Supervisor"
#   * optionally a second Google email to act as an EMPLOYEE -> "Staging Employee"
#     (a supervisor may not approve their own timecard, so the full workflow
#     needs two different Google accounts)
# Only the email is stored; names, role and all timecard data are synthetic.
# Remove the testers later with:  scripts/add-staging-tester.sh --remove
#
# Uses the same staging-only checks as apply-staging.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/lib/staging-target.sh"

ACTION="add"
if [ "${1:-}" = "--remove" ]; then ACTION="remove"; shift; fi
if [ "${1:-}" = "--local-rehearsal" ]; then
  staging_target rehearsal "${2:-}"
else
  staging_target staging "${STAGING_DATABASE_URL:-}"
fi

export PGCONNECT_TIMEOUT=15
PSQL=(psql "$URL" -X -q -v ON_ERROR_STOP=1)

echo "Server reports: $("${PSQL[@]}" -At -c "select current_database() || ' / PostgreSQL ' || current_setting('server_version')")"
seeded="$("${PSQL[@]}" -At -c "select count(*) from public.employees where email like '%@example.test'" 2>/dev/null || echo 0)"
[ "$seeded" -ge 11 ] || fail "this database does not contain the synthetic staging data; run scripts/apply-staging.sh first."

confirm() {
  local expected="$1" answer
  if [ "$MODE" = "rehearsal" ] && [ "${STAGING_TESTER_CONFIRM:-}" = "$expected" ]; then return 0; fi
  read -r -p "Type $expected to continue: " answer
  [ "$answer" = "$expected" ] || { echo "Cancelled. Nothing was changed."; exit 1; }
}

if [ "$ACTION" = "remove" ]; then
  echo "This deactivates the two staging tester profiles (their timecards stay as test history)."
  confirm "REMOVE TESTERS"
  "${PSQL[@]}" -c "update public.employees set status = 'Removed', email = id || '@removed.example.test' where id in ('emp-stg-tester-supervisor', 'emp-stg-tester-employee')"
  echo "Tester profiles deactivated."
  exit 0
fi

valid_email() {
  local re='^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  [[ "$1" =~ $re ]]
}

supervisor_email="${STAGING_TESTER_SUPERVISOR_EMAIL:-}"
employee_email="${STAGING_TESTER_EMPLOYEE_EMAIL-__ask__}"
[ -n "$supervisor_email" ] || read -r -p "Google email to use as the staging SUPERVISOR: " supervisor_email
if [ "$employee_email" = "__ask__" ]; then
  read -r -p "Second Google email to use as the staging EMPLOYEE (Enter to skip): " employee_email
fi
normalize_email() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
supervisor_email="$(normalize_email "$supervisor_email")"
employee_email="$(normalize_email "$employee_email")"

valid_email "$supervisor_email" || fail "the supervisor email is not a valid address."
if [ -n "$employee_email" ]; then
  valid_email "$employee_email" || fail "the employee email is not a valid address."
  [ "$employee_email" != "$supervisor_email" ] || fail "use two different Google accounts (a supervisor may not approve their own timecard)."
fi

taken="$("${PSQL[@]}" -At -v sup="$supervisor_email" -v emp="$employee_email" <<'SQL'
select coalesce(string_agg(id, ', '), '') from public.employees
 where lower(email) in (lower(:'sup'), lower(:'emp'))
   and id not in ('emp-stg-tester-supervisor', 'emp-stg-tester-employee');
SQL
)"
[ -z "$taken" ] || fail "that email already belongs to another staging profile ($taken)."

echo "Staging profiles to create or update:"
echo "  emp-stg-tester-supervisor  'Staging Supervisor'  Supervisor  <- $supervisor_email"
[ -z "$employee_email" ] || echo "  emp-stg-tester-employee    'Staging Employee'    EMT         <- $employee_email"
confirm "ADD TESTERS"

"${PSQL[@]}" --single-transaction -v sup="$supervisor_email" -v emp="$employee_email" <<'SQL'
insert into public.employees (id, first_name, last_name, email, role, scope, job_title, status, employee_type)
values ('emp-stg-tester-supervisor', 'Staging', 'Supervisor', :'sup', 'Supervisor', 'ALS', 'Field Supervisor', 'Active', 'Full Time')
on conflict (id) do update set email = excluded.email, status = 'Active';

insert into public.employees (id, first_name, last_name, email, role, scope, job_title, status, employee_type)
select 'emp-stg-tester-employee', 'Staging', 'Employee', :'emp', 'EMT', 'BLS', 'EMT', 'Active', 'Full Time'
 where :'emp' <> ''
on conflict (id) do update set email = excluded.email, status = 'Active';
SQL
echo "Done. Sign in to the staging app with these Google accounts."
