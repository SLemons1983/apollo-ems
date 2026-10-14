# Shared safety checks for scripts that write to the ApolloEMS STAGING
# database. Source this file, then call:  staging_target <mode> <url>
#   mode = staging   -> must be Supabase project eejahcuftznsabulssew
#   mode = rehearsal -> must be a PostgreSQL server on this machine
# On success it sets MODE, URL (with sslmode=require for Supabase), db_user,
# db_host, db_port, and exports PGPASSWORD (asked for at a hidden prompt when
# targeting Supabase and not already set). Nothing is written by these checks.

STAGING_REF="eejahcuftznsabulssew"
PRODUCTION_REF="xyrusrspvyuwpplhhett"

fail() { echo "REFUSED: $*" >&2; exit 2; }

parse_postgres_url() {
python3 - "$1" <<'PY' || echo "INVALID"
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
}

staging_target() {
  MODE="$1"
  URL="$2"
  [ -n "$URL" ] || fail "no connection string. Set STAGING_DATABASE_URL (staging project only)."

  local lower_url parsed has_password
  lower_url="$(printf '%s' "$URL" | tr '[:upper:]' '[:lower:]')"
  case "$lower_url" in *"$PRODUCTION_REF"*) fail "the connection string refers to the PRODUCTION project ($PRODUCTION_REF)." ;; esac

  parsed="$(parse_postgres_url "$URL")"
  [ -n "$parsed" ] && [ "$parsed" != "INVALID" ] || fail "not a valid postgresql:// connection string."
  IFS=$'\t' read -r db_user has_password db_host db_port <<<"$parsed"
  [ "$has_password" = "no" ] || fail "do not put the password in the connection string; you will be prompted for it."

  if [ "$MODE" = "rehearsal" ]; then
    case "$db_host" in 127.0.0.1|localhost|::1) ;; *) fail "--local-rehearsal only targets a PostgreSQL server on this machine." ;; esac
    return 0
  fi

  if [ "$db_user" != "postgres.$STAGING_REF" ] && [ "$db_host" != "db.$STAGING_REF.supabase.co" ]; then
    fail "the connection must be to staging project $STAGING_REF (user postgres.$STAGING_REF via the session pooler, or host db.$STAGING_REF.supabase.co)."
  fi
  case "$db_host" in *.supabase.com|*.supabase.co) ;; *) fail "host $db_host is not a Supabase host." ;; esac
  [ "$db_port" != "6543" ] || fail "port 6543 is the transaction pooler; use the session pooler (port 5432)."
  case "$lower_url" in *sslmode=*) ;; *) URL="$URL$([[ "$URL" == *\?* ]] && echo '&' || echo '?')sslmode=require" ;; esac
  if [ -z "${PGPASSWORD:-}" ]; then
    read -r -s -p "Staging database password (input hidden): " PGPASSWORD; echo
  fi
  export PGPASSWORD
}
