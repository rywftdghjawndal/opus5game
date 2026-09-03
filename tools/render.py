#!/usr/bin/env python3
"""Deterministic frame render for documentation video.

The sandbox has no GPU, so a real-time screen capture records the software
rasteriser's stutter rather than the authored timing. This steps the master
timeline at a fixed dt and captures each frame, so the assembled video shows
what the piece actually does on real hardware.
"""
import subprocess, sys, os, pathlib

FPS = int(sys.argv[1]) if len(sys.argv) > 1 else 12
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 29.85
OUT = pathlib.Path('/tmp/frames')
OUT.mkdir(exist_ok=True)
for f in OUT.glob('*.png'):
    f.unlink()

n = int(DUR * FPS)
cmds = []
for i in range(n):
    t = i / FPS
    cmds.append(f'eval __step({t:.4f})')
    cmds.append(f'screenshot {OUT}/f{i:05d}.png')

# batch in chunks so a stall is visible and restartable
CHUNK = 60
for c in range(0, len(cmds), CHUNK):
    part = cmds[c:c + CHUNK]
    p = subprocess.run(['agent-browser', 'batch'] + part,
                       capture_output=True, text=True)
    if p.returncode != 0:
        print('batch failed:', p.stderr[:400]); sys.exit(1)
    print(f'{min(c + CHUNK, len(cmds)) // 2}/{n} frames', flush=True)
print('done', n)
