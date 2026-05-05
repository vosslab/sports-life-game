#!/usr/bin/env bash
# build_github_pages.sh
# Builds the repo-root GitHub Pages model:
#   root/index.html + root/src/styles/*.css + root/dist/main.js
# This is NOT a self-contained dist/ deployment. Pages serves the
# repo root; dist/ holds only the compiled JS tree.
# Must NOT produce single-file output. Must NOT mutate dist-single/.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Check node_modules exists
if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run ./setup_game.sh first." >&2
	exit 1
fi

# Run TypeScript compiler
npx tsc -p tsconfig.json

# Create dist directory and add .nojekyll
mkdir -p dist
touch dist/.nojekyll

# Verify output exists
if [ ! -f dist/main.js ]; then
	echo "ERROR: dist/main.js not found after tsc." >&2
	exit 1
fi

echo "Built dist/ (tsc emit, repo-root Pages model)."
