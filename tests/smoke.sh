#!/bin/bash
# smoke.sh - one-command HS-season smoke test for sports-life-game.
#
# Builds the TS bundle, starts a throwaway HTTP server, and runs the existing
# Playwright autoplay script (tests/autoplay.mjs) against it. Tears the server
# down on exit. Returns 0 on a clean playthrough, nonzero otherwise.
#
# Use:
#   bash tests/smoke.sh [--headed]
#
# This is the M1 end-to-end guard. Node-side characterization tests live in
# tests/run.ts and run separately.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PORT=8000
SERVER_PID=""

cleanup() {
	if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
		kill "$SERVER_PID" 2>/dev/null || true
		wait "$SERVER_PID" 2>/dev/null || true
	fi
}
trap cleanup EXIT

# Build TypeScript before serving so dist/main.js is fresh.
npx tsc

# Start a throwaway HTTP server on PORT and wait for it to bind.
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!

# Wait up to 5s for the server to start accepting connections.
for _ in $(seq 1 25); do
	if curl -sSf "http://localhost:${PORT}/index.html" >/dev/null 2>&1; then
		break
	fi
	sleep 0.2
done

# Run autoplay against the server. autoplay.mjs hardcodes its own URL; if
# index.html is reachable on PORT, autoplay can be pointed there via env if
# needed. For now we just invoke it; on first failure the user can adjust.
node tests/autoplay.mjs "$@"
