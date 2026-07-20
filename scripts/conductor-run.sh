#!/usr/bin/env bash
# Starts web + engine for one Conductor workspace.
#
# Several workspaces run in parallel, so fixed ports (3000/8000) would collide.
# Derive a stable per-workspace offset from the directory name: the same
# workspace always gets the same ports, different workspaces don't clash.
set -euo pipefail

WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OFFSET=$(( $(cksum <<< "$(basename "$WORKSPACE")" | cut -d' ' -f1) % 50 ))
WEB_PORT=$((3000 + OFFSET))
ENGINE_PORT=$((8000 + OFFSET))

echo "run: engine on :$ENGINE_PORT, web on :$WEB_PORT"

"$WORKSPACE/.venv/bin/uvicorn" app.main:app \
  --app-dir "$WORKSPACE/engine" --port "$ENGINE_PORT" --reload &
ENGINE_PID=$!
trap 'kill $ENGINE_PID 2>/dev/null || true' EXIT

cd "$WORKSPACE/web"
NEXT_PUBLIC_ENGINE_URL="http://localhost:$ENGINE_PORT" npm run dev -- --port "$WEB_PORT"
