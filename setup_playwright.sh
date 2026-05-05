#!/bin/sh
# One-time install of Playwright + chromium for batch smoke testing.
# This is separate from setup_game.sh because the chromium download is heavy
# and optional for developers who only run the dev server.

set -e

cd "$(git rev-parse --show-toplevel)"

# Check npm and node_modules exist
if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm not found. Install Node.js first (e.g., 'brew install node')." >&2
	exit 1
fi

if [ ! -d node_modules ]; then
	echo "ERROR: node_modules missing. Run ./setup_game.sh first." >&2
	exit 1
fi

echo "Installing Playwright and chromium..."
npm install -D @playwright/test
npx playwright install chromium

echo "Playwright setup complete."
