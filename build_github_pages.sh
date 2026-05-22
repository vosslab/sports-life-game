#!/usr/bin/env bash
# build_github_pages.sh - canonical production build for GitHub Pages.
#
# Style 2 (esbuild + dist-only): dist/ is a self-contained artifact.
#   - Wipes dist/ from scratch.
#   - Type-checks via 'tsc --noEmit -p tsconfig.json'.
#   - Bundles src/main.ts into dist/main.js with esbuild (ESM, es2020,
#     minified, sourcemap, .csv as text, .json as JSON).
#   - Copies src/index.html into dist/index.html and rewrites its
#     absolute /dist/main.js and /src/styles/*.css references to
#     relative paths (main.js, styles/*.css). src/index.html is NOT
#     touched - perl in-place edit runs only on dist/index.html.
#   - Copies src/styles/ into dist/styles/.
#   - Writes dist/.nojekyll so Pages serves files starting with _.
#   - Asserts dist/index.html, dist/main.js, and dist/styles/base.css
#     all exist before exiting.
#
# Hard rule: never produces single-file output. ESM only.
# Note: plugin JSON and weekly choice JSON are esbuild-resolved
# imports inlined into dist/main.js at bundle time; CSV data files
# load via --loader:.csv=text. dist/ is fully self-contained at
# runtime - no /src/... fetches remain.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Pre-flight: node_modules must be present.
if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run 'npm install' first." >&2
	exit 1
fi

# Pre-flight: required source files must be present.
for required in src/main.ts src/index.html; do
	if [ ! -f "$required" ]; then
		echo "ERROR: required source file missing: $required" >&2
		exit 1
	fi
done

if [ ! -d src/styles ]; then
	echo "ERROR: required source directory missing: src/styles" >&2
	exit 1
fi

# Wipe dist/ from scratch.
rm -rf dist
mkdir -p dist

# Type-check (no emit - esbuild owns the build output).
npx tsc --noEmit -p tsconfig.json

# Bundle with esbuild: ESM, browser, minified, sourcemapped.
# CSV becomes a text string at build time; JSON imports are bundled inline.
npx esbuild src/main.ts \
	--bundle \
	--format=esm \
	--target=es2020 \
	--minify \
	--sourcemap \
	--loader:.csv=text \
	--loader:.json=json \
	--outfile=dist/main.js

# Copy static assets into the self-contained dist/.
cp src/index.html dist/index.html
cp -R src/styles dist/styles

# Rewrite absolute paths in dist/index.html ONLY (never touch src/index.html).
# Script tag: /dist/main.js (with optional ?v=N query) -> main.js (relative).
perl -0pi -e 's|/dist/main\.js(?:\?v=[0-9]+)?|main.js|g' dist/index.html
# CSS link tags: /src/styles/foo.css -> styles/foo.css (relative).
perl -0pi -e 's|/src/styles/|styles/|g' dist/index.html

# GitHub Pages needs .nojekyll so it serves files starting with _.
touch dist/.nojekyll

# Final assertions: dist/ must be a complete, self-contained artifact.
for required in dist/index.html dist/main.js dist/styles/base.css; do
	if [ ! -f "$required" ]; then
		echo "ERROR: build incomplete - missing $required" >&2
		exit 1
	fi
done

echo "Built dist/ (esbuild, self-contained, GitHub Pages-ready)."
