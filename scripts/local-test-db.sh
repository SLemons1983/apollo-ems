#!/usr/bin/env bash
# Starts or stops a throwaway local PostgreSQL server for `npm run test:db`.
# Local only: listens on 127.0.0.1, trust auth, data under /tmp. Never points
# at Supabase.
#   scripts/local-test-db.sh start   -> prints the TEST_DATABASE_URL to export
#   scripts/local-test-db.sh stop
set -euo pipefail

PORT="${APOLLO_TEST_DB_PORT:-54329}"
DIR="${APOLLO_TEST_DB_DIR:-/tmp/apollo-pgtest}"
BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"

run() {
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi
}

case "${1:-}" in
  start)
    if [ ! -d "$DIR/data" ]; then
      mkdir -p "$DIR"
      [ "$(id -u)" = "0" ] && chown postgres "$DIR"
      run "$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
    fi
    run "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=127.0.0.1" -l "$DIR/log" -w start >/dev/null
    echo "export TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:$PORT/postgres"
    ;;
  stop)
    run "$BIN/pg_ctl" -D "$DIR/data" -w stop >/dev/null
    ;;
  *)
    echo "usage: $0 start|stop" >&2
    exit 1
    ;;
esac
