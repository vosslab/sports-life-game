#!/bin/sh
# Local dev server for the repo-root GitHub Pages model.
# Serves root/index.html + root/src/styles/*.css + root/dist/main.js.
# This is NOT a self-contained dist/ deployment. Pages serves the repo root;
# dist/ holds only the compiled JS tree.
# Builds via ./build_github_pages.sh (runs tsc, not inlined here).

set -e

cd "$(git rev-parse --show-toplevel)"

# Check node_modules exists
if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run ./setup_game.sh first." >&2
	exit 1
fi

# Build the app
./build_github_pages.sh

# Cache-bust: add timestamp query param to script tag so browser loads fresh JS
TIMESTAMP=$(date +%s)
sed -i '' "s|dist/main.js[^\"]*|dist/main.js?v=${TIMESTAMP}|" index.html

# Open browser and start server
PORT="${PORT:-8123}"
sleep 1 && open "http://localhost:${PORT}/" &
sleep 0.1
python3 -m http.server "${PORT}"
