#!/bin/bash
# usage: shot.sh <html> <out.png> <width> <height>
timeout 60 ~/.cache/ms-playwright/chromium-1228/chrome-linux/chrome --headless --no-sandbox --hide-scrollbars --window-size=$3,$4 --screenshot="$2" "file://$1" >/dev/null 2>&1
