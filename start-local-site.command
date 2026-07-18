#!/bin/bash
# LexusLight — double-click this to preview the site locally with live character
# cards. Character bios are read straight from Characters/<folder>/description.md
# on every reload — edit a .md file, save, refresh the browser tab, done.
cd "$(dirname "$0")"
PORT=8080
( sleep 1 && open "http://localhost:$PORT/index.html" ) &
python3 -m http.server "$PORT"
