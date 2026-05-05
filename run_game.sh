#!/bin/sh

# Bail out early if dependencies are not installed yet.
if [ ! -d node_modules ]; then
	echo "node_modules missing. Run ./setup_game.sh first." >&2
	exit 1
fi

# Compile TypeScript
npx tsc

# Cache-bust: add timestamp query param to script tag so browser loads fresh JS
TIMESTAMP=$(date +%s)
sed -i '' "s|dist/main.js[^\"]*|dist/main.js?v=${TIMESTAMP}|" index.html

# Open browser and start server
sleep 1 && open http://localhost:8123/index.html &
sleep 0.1
python3 -m http.server 8123
