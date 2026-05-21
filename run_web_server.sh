#!/usr/bin/env bash
# run_web_server.sh - local dev preview for the GitHub Pages build.
#
# Always serves dist/ (the self-contained GitHub Pages artifact).
# Never serves the repo root or _site/. Rebuilds dist/ on every run so
# the served files match current src/.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run 'npm install' or 'bash devel/setup_typescript.sh' first." >&2
	exit 1
fi

# Build fresh dist/ before serving so the browser always sees current src/.
./build_github_pages.sh

# Random port per session: each port is its own browser origin, so the
# cache is effectively invalidated every run. PORT env var overrides.
PORT="${PORT:-$((8000 + RANDOM % 1000))}"

echo "Serving dist/ at http://localhost:${PORT}/"

if command -v open >/dev/null 2>&1 && [ -t 0 ]; then
	(sleep 1 && open "http://localhost:${PORT}/") &
fi
python3 -m http.server "${PORT}" --directory dist
