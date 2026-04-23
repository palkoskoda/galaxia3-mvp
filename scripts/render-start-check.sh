#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-10000}"
export PORT
export NODE_ENV="${NODE_ENV:-production}"
export DATABASE_URL="${DATABASE_URL:-/tmp/galaxia3-render-check.db}"
export JWT_SECRET="${JWT_SECRET:-render-check-secret}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:${PORT}}"

echo "Starting production server on port ${PORT}..."
npm start &
server_pid=$!

cleanup() {
  local children
  children="$(pgrep -P "${server_pid}" 2>/dev/null || true)"
  if [ -n "${children}" ]; then
    kill ${children} 2>/dev/null || true
  fi
  kill "${server_pid}" 2>/dev/null || true
  wait "${server_pid}" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null; then
    echo "Production healthcheck passed."
    exit 0
  fi

  if ! kill -0 "${server_pid}" 2>/dev/null; then
    echo "Production server exited before healthcheck passed."
    wait "${server_pid}"
  fi

  sleep 1
done

echo "Production healthcheck timed out."
exit 1
