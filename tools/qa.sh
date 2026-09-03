#!/usr/bin/env bash
# usage: tools/qa.sh <prefix> <t1> <t2> ...
# Advances the master timeline frame-by-frame (rendering each step) so scrubbed
# frames match real playback, then captures + downscales each requested time.
set -euo pipefail
cd "$(dirname "$0")/.."
pfx="$1"; shift
agent-browser open "http://localhost:3000/index.html" >/dev/null
for n in $(seq 1 40); do
  r=$(agent-browser eval "(()=>{try{return typeof master==='object'&&master?'RDY':'no'}catch(e){return 'no'}})()" 2>/dev/null || echo no)
  case "$r" in *RDY*) break;; esac
  sleep 0.4
done
agent-browser eval "master.pause(); gsap.ticker.lagSmoothing(0);
window.__step=(target)=>{ let t=master.time(); if(target<t){ master.time(0); gsap.ticker.tick(); t=0; }
  while(t<target-1e-9){ t=Math.min(target,t+1/60); master.time(t); gsap.ticker.tick(); }
  return master.time().toFixed(3); }; 'ok'" >/dev/null
i=0
for t in "$@"; do
  i=$((i+1))
  agent-browser eval "__step($t)" >/dev/null
  agent-browser screenshot "shots/${pfx}_$(printf %02d $i).png" >/dev/null
  ffmpeg -y -loglevel error -i "shots/${pfx}_$(printf %02d $i).png" -vf scale=1300:-1 "shots/${pfx}_$(printf %02d $i)_s.png"
  echo "t=$t -> shots/${pfx}_$(printf %02d $i)_s.png"
done
