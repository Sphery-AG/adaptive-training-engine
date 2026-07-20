#!/usr/bin/env bash
# Runs once per Conductor workspace. Each workspace is a fresh git worktree, so
# anything gitignored (_local/, .venv/, node_modules/) does not exist yet here.
set -euo pipefail

# Conductor sets CONDUCTOR_ROOT_PATH to the original clone. Fall back to the
# main worktree so this script also works when run by hand.
ROOT="${CONDUCTOR_ROOT_PATH:-$(git worktree list --porcelain | head -1 | cut -d' ' -f2-)}"
WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$ROOT" ] || [ "$ROOT" = "$WORKSPACE" ]; then
  echo "setup: running in the root clone, skipping symlink step"
else
  # _local/ is 40MB of confidential Sphery reference material and is
  # deliberately never committed. Symlink rather than copy: one source of
  # truth, no duplication across workspaces.
  if [ -d "$ROOT/_local" ] && [ ! -e "$WORKSPACE/_local" ]; then
    ln -s "$ROOT/_local" "$WORKSPACE/_local"
    echo "setup: linked _local -> $ROOT/_local"
  fi
fi

echo "setup: installing web dependencies"
(cd "$WORKSPACE/web" && npm ci)

echo "setup: creating engine virtualenv"
python3 -m venv "$WORKSPACE/.venv"
"$WORKSPACE/.venv/bin/pip" install --quiet --upgrade pip
"$WORKSPACE/.venv/bin/pip" install --quiet -r "$WORKSPACE/engine/requirements.txt"

# The MySQL container binds host port 3306, so exactly one instance can run
# across all workspaces. It holds a read-only static export, so sharing it is
# correct — start it once from the root clone, not per workspace.
if ! docker compose -f "$ROOT/docker-compose.yml" ps --status running --quiet db 2>/dev/null | grep -q .; then
  echo "setup: NOTE — shared MySQL is not running. Start it once from the root clone:"
  echo "         cd $ROOT && docker compose up -d db"
fi

echo "setup: done"
