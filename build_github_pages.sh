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

# Stage Pages artifact under _site/ for GitHub Actions upload.
# Mirrors the repo-root layout the browser expects: index.html + src/styles + dist.
rm -rf _site
mkdir -p _site/src
cp index.html _site/index.html
cp -R src/styles _site/src/styles
cp -R src/data _site/src/data
cp -R dist _site/dist
touch _site/.nojekyll

# Cache-bust the staged index.html so deploys serve fresh JS without
# touching the tracked index.html.
TIMESTAMP=$(date +%s)
perl -0pi -e "s|dist/main\\.js(?:\\?v=[0-9]+)?|dist/main.js?v=${TIMESTAMP}|g" _site/index.html

if [ ! -f _site/index.html ] || [ ! -f _site/dist/main.js ]; then
	echo "ERROR: _site/ staging incomplete." >&2
	exit 1
fi

echo "Built dist/ + staged _site/ (repo-root Pages model)."
