#!/usr/bin/env bash
# Applies the ApolloEMS staging database stack to the STAGING Supabase project.
#
#   STAGING_DATABASE_URL='postgresql://postgres.eejahcuftznsabulssew:<password>@<pooler-host>:5432/postgres' \
#     scripts/apply-staging.sh            # shows the plan and asks for confirmation
#
# Safety:
#   * refuses unless the connection string names the staging project ref and
#     never the production ref;
#   * prints the server's own identity before asking for confirmation;
#   * each file runs in its own transaction and stops at the first error;
#   * 001_reconstructed_base_schema.sql refuses to run if the tables exist.
# The password is read from STAGING_DATABASE_URL; it is never printed.
set -euo pipefail

STAGING_REF="eejahcuftznsabulssew"
PRODUCTION_REF="xyrusrspvyuwpplhhett"
URL="${STAGING_DATABASE_URL:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

[ -n "$URL" ] || { echo "Set STAGING_DATABASE_URL (staging project only)." >&2; exit 1; }
case "$URL" in *"$PRODUCTION_REF"*) echo "REFUSED: this is the PRODUCTION project." >&2; exit 1 ;; esac
case "$URL" in *"$STAGING_REF"*) ;; *) echo "REFUSED: connection string does not name the staging project ($STAGING_REF)." >&2; exit 1 ;; esac

export PGOPTIONS="-c statement_timeout=120000"
echo "Connected server reports:"
psql "$URL" -X -At -c "select 'database=' || current_database() || ' user=' || current_user || ' version=' || current_setting('server_version')"

FILES=("$ROOT/supabase/staging/001_reconstructed_base_schema.sql")
while IFS= read -r f; do FILES+=("$f"); done < <(ls "$ROOT"/supabase/migrations/*.sql | sort)
FILES+=("$ROOT/supabase/staging/002_staging_access_rules.sql" "$ROOT/supabase/staging/003_synthetic_seed.sql")

echo "Files to apply, in order:"
for f in "${FILES[@]}"; do echo "  ${f#$ROOT/}  (sha256 $(sha256sum "$f" | cut -c1-12))"; done
read -r -p "Type APPLY TO STAGING to continue: " answer
[ "$answer" = "APPLY TO STAGING" ] || { echo "Cancelled."; exit 1; }

for f in "${FILES[@]}"; do
  echo "-> ${f#$ROOT/}"
  psql "$URL" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$f"
done
echo "Staging database prepared."
