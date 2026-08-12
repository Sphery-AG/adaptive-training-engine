#!/bin/bash
# Deploy web/ to Vercel production, retrying until the daily cap lets us through.
#
# Why this exists: on 12 Aug 2026 the account hit Vercel's Hobby cap of 100
# deployments/day. The cap is account-wide, and a GitHub Actions pipeline on the
# unrelated Overlay repo was spending it ~40 times a day. Our own deploy was
# collateral damage, so the finished build sat on GitHub while production served
# an older one.
#
# Runs hourly from a LaunchAgent. Exits quietly when production already matches
# the local HEAD, and unloads the agent once a deploy succeeds, so it stops on
# its own rather than redeploying every hour forever.
#
# Log: _local/auto-deploy.log     Disable: launchctl unload the plist below.
set -uo pipefail

REPO="/Users/anthonymccrovitz/Desktop/Sphery Work/Sphery/adaptive-training-engine"
LABEL="com.sphery.adaptive-training.autodeploy"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$REPO/_local/auto-deploy.log"
STAMP="$REPO/_local/.last-deployed-sha"

export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin"
mkdir -p "$REPO/_local"
say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

cd "$REPO" || { say "repo missing, giving up"; exit 1; }
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)

# Already shipped this commit? Nothing to do.
if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$HEAD_SHA" ]; then
  say "already deployed ${HEAD_SHA:0:7}, nothing to do"
  exit 0
fi

say "deploying ${HEAD_SHA:0:7}"
OUT=$(cd "$REPO/web" && npx --yes vercel@latest --prod --yes 2>&1)

if printf '%s' "$OUT" | grep -q "api-deployments-free-per-day"; then
  say "still rate limited, will retry next hour"
  exit 0
fi

URL=$(printf '%s' "$OUT" | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | tail -1)
if [ -z "$URL" ]; then
  say "deploy failed: $(printf '%s' "$OUT" | tail -3 | tr '\n' ' ')"
  exit 1
fi

echo "$HEAD_SHA" > "$STAMP"
say "deployed ${HEAD_SHA:0:7} -> $URL"

# Shipped. Stop running.
launchctl unload "$PLIST" 2>/dev/null
say "auto-deploy disabled; re-enable with: launchctl load -w $PLIST"
