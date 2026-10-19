#!/usr/bin/env bash
set -euo pipefail
export PORT="${PORT:-10000}"
export NODE_ENV=production
node server/index.cjs &
server_pid=$!
cleanup() { kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; }
trap cleanup EXIT
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null; then
    curl -fsS "http://127.0.0.1:${PORT}/" | grep -q 'Moje obedy'
    echo "Production healthcheck and frontend passed. No database or login required."
    exit 0
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "Server exited before healthcheck passed."
    wait "$server_pid"
    exit 1
  fi
  sleep 1
done
echo "Production healthcheck timed out."
exit 1
