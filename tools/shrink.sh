#!/usr/bin/env bash
# downscale captured frames to a size view_image can ingest
set -euo pipefail
cd "$(dirname "$0")/.."
for f in "$@"; do
  out="${f%.png}_s.png"
  ffmpeg -y -loglevel error -i "$f" -vf scale=1280:-1 "$out"
  echo "$out $(stat -c%s "$out")"
done
