#!/bin/sh

npx tsc
sleep 1 && open http://localhost:8123/index.html &
sleep 0.1
python3 -m http.server 8123
