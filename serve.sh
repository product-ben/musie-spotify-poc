#!/usr/bin/env bash
# Serves the app on the loopback address Spotify expects for the redirect URI.
set -euo pipefail
cd "$(dirname "$0")"
echo "musie → http://127.0.0.1:5173/"
exec python3 -m http.server 5173 --bind 127.0.0.1
