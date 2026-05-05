#!/bin/sh
# One-time setup: install npm deps (TypeScript) and do an initial build.
# Run this after cloning the repo, or whenever node_modules is missing.

set -e

cd "$(git rev-parse --show-toplevel)"

if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm not found. Install Node.js first (e.g., 'brew install node')." >&2
	exit 1
fi

echo "Installing npm dependencies..."
npm install

echo "Compiling TypeScript..."
npx tsc

echo "Setup complete. Run ./run_game.sh to start the game."
