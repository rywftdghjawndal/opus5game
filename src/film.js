/* ============================================================================
   THIRTEEN PUMPS — Soho, London, 1854
   578 death markers from John Snow's map (Dodson & Tobler digitization, via
   HistData). Every mark on screen is one recorded death, and it stays the same
   mark from the time chart, to the map, to the histogram.
   ========================================================================== */

gsap.registerPlugin(CustomEase);

/* ---------- authored easing ------------------------------------------------ */
const E = {
  land:   CustomEase.create('land',   'M0,0 C0.12,0.86 0.16,1 1,1'),   // arrives and stays
  slam:   CustomEase.create('slam',   'M0,0 C0.02,0.94 0.06,1 1,1'),   // hard attack, long tail
  travel: CustomEase.create('travel', 'M0,0 C0.62,0 0.2,1 1,1'),       // rest → accelerate → catch
  settle: CustomEase.create('settle', 'M0,0 C0.18,0.9 0.28,1.06 1,1'), // small overshoot
  cam:    CustomEase.create('cam',    'M0,0 C0.44,0 0.12,1 1,1'),      // slow camera
};
const fLand   = gsap.parseEase(E.land);
const fTravel = gsap.parseEase(E.travel);
const fSettle = gsap.parseEase(E.settle);
const fOut2   = gsap.parseEase('power2.out');

/* ---------- data ----------------------------------------------------------- */
const DEATHS  = RAW.D.split(' ').map(s => { const v = s.split(','); return { x: +v[0] / 1000, y: +v[1] / 1000 }; });
const STREETS = RAW.S.split('|').map(s => s.split(' ').map(p => { const v = p.split(','); return [+v[0] / 1000, +v[1] / 1000]; }));
const PUMPS   = RAW.P.split('|').map(s => { const v = s.split(';'); return { label: v[0], x: +v[1] / 1000, y: +v[2] / 1000 }; });
const ASSIGN  = RAW.A.split('').map(c => parseInt(c, 36));
const DAYS    = RAW.T.split('|').map(s => { const v = s.split(','); return { md: v[0], attacks: +v[1], deaths: +v[2] }; });

const N = DEATHS.length;   // 578
const NP = PUMPS.length;   // 13
const BROAD = 6;

const pumpCount = new Array(NP).fill(0);
ASSIGN.forEach(i => pumpCount[i]++);

const MONTH = { '08': 'AUGUST', '09': 'SEPTEMBER' };
const dayLabel = d => `${+d.md.slice(3)} ${MONTH[d.md.slice(0, 2)]}`;

/* ---------- frame ---------------------------------------------------------- */
const W = 1600, H = 900;
const stage = document.getElementById('stage');
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: true });
const TYPE = document.getElementById('type');

function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  stage.style.transform = `scale(${Math.min(window.innerWidth / W, window.innerHeight / H)})`;
}
addEventListener('resize', fit); fit();

/* ---------- the printed stock ----------------------------------------------
   The paper is painted into the canvas, not the DOM, so the grain/vignette
   plate above has a real backdrop to multiply against. */
const STOCK = (function () {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#EAE4D5';
  g.fillRect(0, 0, W, H);
  const wash = [
    [0.22, 0.12, 1.20, 0.90, '#F4EFE2', 0.58],
    [0.86, 0.90, 1.00, 0.85, '#DCD4C0', 0.62],
    [0.60, 0.34, 0.60, 0.55, '#F1ECDE', 0.72],
  ];
  for (const [px, py, rx, ry, col, stop] of wash) {
    g.save();
    g.translate(W * px, H * py);
    g.scale(rx, ry * H / W);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, W);
    rg.addColorStop(0, col);
    rg.addColorStop(stop, 'rgba(234,228,213,0)');
    g.fillStyle = rg;
    g.fillRect(-W, -W, W * 2, W * 2);
    g.restore();
  }
  return c;
})();

/* ---------- optical plate --------------------------------------------------
   Grain and vignette are both multiplicative darkenings, so they bake into a
   single overlay. Four phases are pre-rendered once and blitted in rotation:
   the shimmer stays, but no gradient or pattern is evaluated per frame. */
const PLATE = { ready: 0, frames: [] };
(function buildPlate() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.34" intercept="0.66"/></feComponentTransfer></filter><rect width="220" height="220" filter="url(#n)"/></svg>`;
  const img = new Image();
  img.onload = () => {
    const pat = ctx.createPattern(img, 'repeat');
    for (let f = 0; f < 4; f++) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      g.save();
      g.globalAlpha = 0.34;
      g.translate(-((f * 53) % 220), -((f * 97) % 220));
      g.fillStyle = pat;
      g.fillRect(0, 0, W + 220, H + 220);
      g.restore();
      const rg = g.createRadialGradient(W * 0.5, H * 0.47, H * 0.46, W * 0.5, H * 0.47, H * 0.99);
      rg.addColorStop(0, 'rgba(255,255,255,0)');
      rg.addColorStop(0.66, 'rgba(206,195,174,0.22)');
      rg.addColorStop(1, 'rgba(150,133,104,0.62)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
      PLATE.frames.push(c);
    }
    PLATE.ready = 1;
  };
  img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
})();

/* ---------- palette -------------------------------------------------------- */
const C = { ink: '22,19,14', ink2: '87,80,63', ink3: '154,145,121', red: '174,54,32', slate: '62,85,96' };
const rgba = (c, a) => `rgba(${c},${a})`;

/* ---------- animated state ------------------------------------------------- */
const S = {
  paper: 0,
  cx: 11.62, cy: 11.0, k: 46, ox: W / 2, oy: H / 2, shakeX: 0, shakeY: 0,
  streetProg: 0, streetA: 0,
  pumpProg: 0, pumpLabelA: 0, broadRing: 0, broadRingA: 0,
  chartA: 0, chartAxis: 0, dayCursor: -1, chartLabelA: 0,
  histA: 0, histAxis: 0,
  ruleX: 0, ruleA: 0, ruleGrow: 0,
  breweryA: 0, hampA: 0, hampReach: 0,
  mis: 0, tp: 1, markA: 1, peakA: 0, tint: 0, dimFar: 0,
  mapLock: 0,
};

/* ---------- marks ---------------------------------------------------------- */
const P = new Array(N);
for (let i = 0; i < N; i++) {
  P[i] = {
    i, mx: DEATHS[i].x, my: DEATHS[i].y, pump: ASSIGN[i],
    x: 0, y: 0, w: 3, h: 5.4, a: 0,
    ax: 0, ay: 0, aw: 3, ah: 5.4,
    bx: 0, by: 0, bw: 3, bh: 5.4,
    qx: 0, qy: 0, dl: 0, spread: 0, jit: Math.random(), day: 0, hrow: 0,
  };
}

/* --- chart slots: the real daily fatal-attack curve ------------------------ */
const CHART = { x0: 300, x1: 1330, yb: 742, pitch: 0, across: 3, mw: 3.4, mh: 6.2, rowPitch: 9.9, gap: 1.5 };
CHART.pitch = (CHART.x1 - CHART.x0) / DAYS.length;
(function buildChart() {
  const total = DAYS.reduce((a, d) => a + d.attacks, 0);
  const raw = DAYS.map(d => d.attacks * N / total);
  const alloc = raw.map(Math.floor);
  let rem = N - alloc.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0])
     .forEach(([, i]) => { if (rem > 0) { alloc[i]++; rem--; } });
  const cw = CHART.across * CHART.mw + (CHART.across - 1) * CHART.gap;
  let p = 0;
  for (let d = 0; d < DAYS.length; d++) {
    for (let n = 0; n < alloc[d]; n++) {
      const row = Math.floor(n / CHART.across), col = n % CHART.across;
      const pt = P[p++];
      pt.day = d;
      pt.cx_ = CHART.x0 + d * CHART.pitch + (CHART.pitch - cw) / 2 + col * (CHART.mw + CHART.gap);
      pt.cy_ = CHART.yb - CHART.mh - row * CHART.rowPitch;
    }
  }
  CHART.alloc = alloc;
})();

/* --- histogram slots: 13 columns, ranked ----------------------------------- */
const HIST = { x0: 206, x1: 1480, yb: 752, pitch: 0, across: 12, mw: 4.6, mh: 7.4, rowPitch: 11.4, gap: 1.3 };
HIST.pitch = (HIST.x1 - HIST.x0) / NP;
HIST.order = PUMPS.map((p, i) => i).sort((a, b) => pumpCount[b] - pumpCount[a]);
HIST.slotOf = new Array(NP);
HIST.order.forEach((pi, slot) => HIST.slotOf[pi] = slot);
HIST.maxRows = Math.ceil(pumpCount[BROAD] / HIST.across);
HIST.cw = HIST.across * HIST.mw + (HIST.across - 1) * HIST.gap;
HIST.colX = slot => HIST.x0 + slot * HIST.pitch + (HIST.pitch - HIST.cw) / 2;
HIST.broadCx = HIST.colX(HIST.slotOf[BROAD]) + HIST.cw / 2;
(function buildHist() {
  const groups = PUMPS.map(() => []);
  P.forEach(pt => groups[pt.pump].push(pt));
  groups.forEach((g, pi) => {
    g.sort((a, b) => a.my - b.my);           // south first, so the column reads as growing
    const cx0 = HIST.colX(HIST.slotOf[pi]);
    g.forEach((pt, n) => {
      const row = Math.floor(n / HIST.across), col = n % HIST.across;
      pt.hx_ = cx0 + col * (HIST.mw + HIST.gap);
      pt.hy_ = HIST.yb - HIST.mh - row * HIST.rowPitch;
      pt.hrow = row;
    });
  });
})();

/* ---------- projection ----------------------------------------------------- */
const sx = mx => S.ox + (mx - S.cx) * S.k + S.shakeX;
const sy = my => S.oy - (my - S.cy) * S.k + S.shakeY;

/* ---------- transitions ---------------------------------------------------- */
function setFrom() { for (const p of P) { p.ax = p.x; p.ay = p.y; p.aw = p.w; p.ah = p.h; } }
function toMap()   { for (const p of P) { p.bx = sx(p.mx) - 1.7; p.by = sy(p.my) - 3.7; p.bw = 3.4; p.bh = 7.4; } }
function toChart() { for (const p of P) { p.bx = p.cx_; p.by = p.cy_; p.bw = CHART.mw; p.bh = CHART.mh; } }
function toHist()  { for (const p of P) { p.bx = p.hx_; p.by = p.hy_; p.bw = HIST.mw;  p.bh = HIST.mh;  } }

/* curve the travel so a move arcs instead of sliding */
function arc(bow, side) {
  for (const p of P) {
    const dx = p.bx - p.ax, dy = p.by - p.ay;
    const len = Math.hypot(dx, dy) || 1;
    const s = side ? side(p) : 1;
    p.qx = (p.ax + p.bx) / 2 + (-dy / len) * bow * s;
    p.qy = (p.ay + p.by) / 2 + (dx / len) * bow * s;
  }
}
function delays(fn, spread) {
  for (const p of P) { p.dl = Math.min(0.98, Math.max(0, fn(p))) * spread; p.spread = spread; }
}

/* ---------- canvas text ---------------------------------------------------- */
const CANLS = 'letterSpacing' in ctx;
function txt(str, x, y, o = {}) {
  const size = o.size || 12;
  ctx.save();
  ctx.globalAlpha = o.a === undefined ? 1 : o.a;
  ctx.font = `${o.weight || 500} ${size}px 'IBM Plex Mono',monospace`;
  if (CANLS) ctx.letterSpacing = (o.ls === undefined ? 0.18 : o.ls) * size + 'px';
  ctx.textAlign = o.align || 'left';
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = y = 0; }
  // a paper halo along the glyph outline, so a label reads over the inked
  // street network the way a knocked-out label does on a printed plate
  if (o.knock) {
    ctx.strokeStyle = 'rgba(236,230,216,0.92)';
    ctx.lineWidth = size * 0.42;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = o.color || rgba(C.ink2, 1);
  ctx.fillText(str, x, y);
  ctx.restore();
}

/* ---------- draw order for streets: centre outward ------------------------- */
const bs = PUMPS[BROAD];
const SC = { x: 11.65, y: 10.98 };                 // centre of the surveyed plate
const streetDelay = new Array(STREETS.length);
const streetFade = new Array(STREETS.length);      // dissolve the plate at its margins
const streetSegs = new Array(STREETS.length);      // per-segment lengths, measured once
const streetLen = new Array(STREETS.length);
const STREET_BUCKETS = Array.from({ length: 12 }, () => []);
(function prepStreets() {
  const mid = STREETS.map(s => s[Math.floor(s.length / 2)]);
  const d = mid.map(m => Math.hypot(m[0] - bs.x, m[1] - bs.y));
  const max = Math.max(...d);
  d.forEach((v, i) => streetDelay[i] = v / max);
  for (let i = 0; i < STREETS.length; i++) {
    const st = STREETS[i], segs = [];
    let total = 0;
    for (let j = 1; j < st.length; j++) {
      const l = Math.hypot(st[j][0] - st[j - 1][0], st[j][1] - st[j - 1][1]);
      segs.push(l); total += l;
    }
    streetSegs[i] = segs; streetLen[i] = total;
    // the digitisation ends on a hard rectangle; fade it out so the network
    // reads as an inked plate settling into paper rather than a cropped file
    const r = Math.hypot((mid[i][0] - SC.x) / 8.4, (mid[i][1] - SC.y) / 7.9);
    streetFade[i] = 1 - Math.min(1, Math.max(0, (r - 0.52) / 0.46)) ** 1.4;
  }
})();
const pumpRank = PUMPS.map((p, i) =>
  i === BROAD ? 0 : Math.hypot(p.x - bs.x, p.y - bs.y) / 7.6);

/* hand-tuned label offsets, in pump index order */
const PL = [
  [9, 3, 'left'], [9, 3, 'left'], [9, -6, 'left'], [9, 3, 'left'],
  [-9, 3, 'right'], [-9, 3, 'right'], [14, -11, 'left'], [-9, 3, 'right'],
  [9, 13, 'left'], [9, 3, 'left'], [-9, 3, 'right'], [9, 3, 'left'], [-9, 3, 'right'],
];

/* ---------- render --------------------------------------------------------- */
function drawStreets() {
  if (S.streetA <= 0.002) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(C.ink2, 0.8);
  ctx.lineWidth = 1.05;
  // streets are bucketed by opacity and stroked as a handful of batched paths:
  // one stroke() per bucket instead of one per street
  const BK = 12;
  const buckets = STREET_BUCKETS;
  for (let b = 0; b < BK; b++) buckets[b].length = 0;
  for (let i = 0; i < STREETS.length; i++) {
    const fade = streetFade[i];
    if (fade <= 0.012) continue;
    const local = Math.min(1, Math.max(0, (S.streetProg - streetDelay[i] * 0.6) / 0.4));
    if (local <= 0) continue;
    const e = fOut2(local);
    const a = S.streetA * fade * (0.32 + 0.68 * e);
    if (a <= 0.008) continue;
    const b = Math.min(BK - 1, (a * BK) | 0);
    buckets[b].push(i, e);
  }
  for (let b = 0; b < BK; b++) {
    const list = buckets[b];
    if (!list.length) continue;
    ctx.globalAlpha = (b + 0.5) / BK;
    ctx.beginPath();
    for (let n = 0; n < list.length; n += 2) {
      const st = STREETS[list[n]], e = list[n + 1];
      const total = streetLen[list[n]], segs = streetSegs[list[n]];
      const want = total * e;
      ctx.moveTo(sx(st[0][0]), sy(st[0][1]));
      let acc = 0;
      for (let j = 1; j < st.length; j++) {
        const l = segs[j - 1];
        if (acc + l <= want) { ctx.lineTo(sx(st[j][0]), sy(st[j][1])); acc += l; }
        else {
          const f = l ? (want - acc) / l : 0;
          ctx.lineTo(sx(st[j - 1][0] + (st[j][0] - st[j - 1][0]) * f),
                     sy(st[j - 1][1] + (st[j][1] - st[j - 1][1]) * f));
          break;
        }
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawPumps() {
  if (S.pumpProg <= 0.002) return;
  ctx.save();
  for (let i = 0; i < NP; i++) {
    const local = Math.min(1, Math.max(0, (S.pumpProg - pumpRank[i] * 0.62) / 0.38));
    if (local <= 0) continue;
    const e = fSettle(local);
    const p = PUMPS[i], X = sx(p.x), Y = sy(p.y), isB = i === BROAD;
    const r = (isB ? 5.6 : 3.4) * e;
    ctx.globalAlpha = local;
    ctx.strokeStyle = rgba(isB ? C.red : C.slate, 0.92);
    ctx.lineWidth = isB ? 1.8 : 1.15;
    ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X, Y - r - 4.5 * e); ctx.lineTo(X, Y - r - 1);
    ctx.moveTo(X, Y + r + 1); ctx.lineTo(X, Y + r + 4.5 * e);
    ctx.stroke();
    if (S.pumpLabelA > 0.01) {
      // an annotation owns the space it points into: drop the pump caption
      // underneath it rather than letting two labels double-print
      let la = S.pumpLabelA * local;
      if (i === 8 || i === 9) la *= 1 - S.breweryA;   // Briddle St, So Soho
      if (i === 3) la *= 1 - S.hampA;                 // Oxford St #2
      if (la <= 0.01) continue;
      txt(p.label.toUpperCase(), X + PL[i][0], Y + PL[i][1], {
        size: isB ? 11.5 : 9.5, ls: 0.2, align: PL[i][2], knock: 1,
        color: rgba(isB ? C.red : C.ink3, 1),
        a: la, weight: isB ? 600 : 500,
      });
    }
  }
  if (S.broadRingA > 0.01) {
    ctx.globalAlpha = S.broadRingA;
    ctx.strokeStyle = rgba(C.red, 0.5);
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(sx(bs.x), sy(bs.y), 20 + S.broadRing * 118, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawChartAxis() {
  if (S.chartA <= 0.002) return;
  ctx.save();
  const g = S.chartAxis, span = CHART.x1 - CHART.x0 + 28, edge = CHART.x0 - 14 + span * g;
  ctx.globalAlpha = S.chartA;
  ctx.strokeStyle = rgba(C.ink2, 0.55); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(CHART.x0 - 14, CHART.yb + 0.5); ctx.lineTo(edge, CHART.yb + 0.5); ctx.stroke();
  for (const tk of [[0, '19 AUG'], [13, '1 SEP'], [20, '8 SEP'], [42, '30 SEP']]) {
    const X = CHART.x0 + tk[0] * CHART.pitch + CHART.pitch / 2;
    if (X > edge) continue;
    const a = S.chartA * S.chartLabelA;
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(C.ink3, 0.9);
    ctx.beginPath(); ctx.moveTo(X, CHART.yb + 1); ctx.lineTo(X, CHART.yb + 7); ctx.stroke();
    txt(tk[1], X, CHART.yb + 25, { size: 10, align: 'center', color: rgba(C.ink3, 1), a });
  }
  ctx.restore();
}

function drawHistAxis() {
  if (S.histA <= 0.002) return;
  ctx.save();
  const g = S.histAxis, span = HIST.x1 - HIST.x0 + 32, edge = HIST.x0 - 16 + span * g;
  ctx.globalAlpha = S.histA;
  ctx.strokeStyle = rgba(C.ink2, 0.55); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(HIST.x0 - 16, HIST.yb + 0.5); ctx.lineTo(edge, HIST.yb + 0.5); ctx.stroke();
  for (let slot = 0; slot < NP; slot++) {
    const pi = HIST.order[slot];
    const X = HIST.colX(slot) + HIST.cw / 2;
    if (X > edge) continue;
    const isB = pi === BROAD, a = S.histA * S.histAxis;
    txt(PUMPS[pi].label.toUpperCase(), X + 4, HIST.yb + 16, {
      size: isB ? 11 : 9.5, ls: 0.2, rot: Math.PI / 2,
      color: rgba(isB ? C.red : C.ink3, 1), a, weight: isB ? 600 : 500,
    });
    if (!isB) {
      const top = HIST.yb - Math.ceil(pumpCount[pi] / HIST.across) * HIST.rowPitch;
      txt(String(pumpCount[pi]), X, top - 9, {
        size: 11, ls: 0.06, align: 'center', color: rgba(C.ink2, 1), a: a * 0.95,
      });
    }
  }
  ctx.restore();
}

function drawMarks() {
  const t = S.tp;
  if (S.mapLock) toMap();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';   // overlapping ink darkens: density reads as density
  for (let i = 0; i < N; i++) {
    const p = P[i];
    if (t < 1) {
      const local = Math.min(1, Math.max(0, (t - p.dl) / (1 - p.spread)));
      const e = fTravel(local), u = 1 - e;
      p.x = u * u * p.ax + 2 * u * e * p.qx + e * e * p.bx;
      p.y = u * u * p.ay + 2 * u * e * p.qy + e * e * p.by;
      p.w = p.aw + (p.bw - p.aw) * e;
      p.h = p.ah + (p.bh - p.ah) * e;
    } else if (S.mapLock || p.locked) {
      p.x = p.bx; p.y = p.by; p.w = p.bw; p.h = p.bh;
    }
    const base = p.a * S.markA;
    if (base <= 0.004) continue;
    const far = p.pump !== BROAD;
    // dimFar reads signed: positive pushes the twelve back, negative pushes
    // Broad Street back so the twelve can be read on their own
    const dim = far ? 1 - Math.max(0, S.dimFar) * 0.66
                    : 1 - Math.max(0, -S.dimFar) * 0.76;
    if (S.tint > 0.01) {
      ctx.globalAlpha = base * S.tint * dim;
      ctx.fillStyle = rgba(far ? C.slate : C.red, 0.92);
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.globalAlpha = base * (1 - S.tint) * dim;
      ctx.fillStyle = rgba(C.ink, 0.88);
      ctx.fillRect(p.x, p.y, p.w, p.h);
    } else {
      ctx.globalAlpha = base * dim;
      ctx.fillStyle = rgba(C.ink, 0.88);
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  }
  if (S.mis > 0.01) {   // print misregistration on the impact frame
    ctx.fillStyle = rgba(C.red, 0.5 * S.mis);
    const o = 3.4 * S.mis;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (p.a * S.markA <= 0.02) continue;
      ctx.fillRect(p.x + o, p.y - o * 0.6, p.w, p.h);
    }
  }
  ctx.restore();
}

/* day-driven reveal, used only while the chart builds */
function chartReveal() {
  const c = S.dayCursor;
  for (let i = 0; i < N; i++) {
    const p = P[i];
    const age = (c - p.day - p.jit * 0.7) / 0.5;
    p.w = CHART.mw; p.h = CHART.mh; p.x = p.cx_;
    if (age <= 0) { p.a = 0; p.y = p.cy_ - 26; continue; }
    const k = Math.min(1, age);
    p.a = Math.min(1, k * 1.7);
    p.y = p.cy_ - 26 * (1 - fLand(k));
  }
}

/* the date label reads off the same cursor as the marks, so they cannot drift */
let lastDay = -1;
function chartTick() {
  chartReveal();
  const d = Math.min(DAYS.length - 1, Math.max(0, Math.round(S.dayCursor)));
  if (d === lastDay) return;
  lastDay = d;
  const el = T.date.el;
  el.textContent = dayLabel(DAYS[d]);
  el.style.color = (d === 13 || d === 14) ? 'var(--red)' : '';
}

function drawRule() {
  if (S.ruleA <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = S.ruleA;
  const X = S.ruleX, y0 = CHART.yb + 12;
  ctx.strokeStyle = rgba(C.red, 0.85); ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X, y0 - (y0 - 250) * S.ruleGrow); ctx.stroke();
  ctx.fillStyle = rgba(C.red, 0.9);
  ctx.beginPath(); ctx.arc(X, y0, 2.7, 0, 7); ctx.fill();
  ctx.restore();
}

function drawPeak() {
  if (S.peakA <= 0.01) return;
  const d = 13;                                   // 1 September
  const X = CHART.x0 + d * CHART.pitch + CHART.pitch / 2;
  const Y = CHART.yb - Math.ceil(CHART.alloc[d] / CHART.across) * CHART.rowPitch;
  ctx.save();
  ctx.globalAlpha = S.peakA;
  ctx.strokeStyle = rgba(C.red, 0.8); ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(X + 12, Y + 4); ctx.lineTo(X + 52, Y + 4); ctx.stroke();
  txt('143 FATAL ATTACKS', X + 60, Y + 1,  { size: 12, ls: 0.19, color: rgba(C.red, 1), a: S.peakA, weight: 600 });
  txt('1 SEPTEMBER 1854',  X + 60, Y + 17, { size: 10, ls: 0.19, color: rgba(C.red, 1), a: S.peakA * 0.72 });
  ctx.restore();
}

function drawAnnotations() {
  if (S.breweryA > 0.01) {
    const X = sx(13.10), Y = sy(11.63);
    ctx.save();
    ctx.globalAlpha = S.breweryA;
    ctx.strokeStyle = rgba(C.slate, 0.95); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(X, Y, 18, -Math.PI / 2, -Math.PI / 2 + 6.283 * S.breweryA); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X + 8, Y + 15); ctx.lineTo(X + 40, Y + 52); ctx.stroke();
    txt('LION BREWERY',     X + 46, Y + 52, { size: 10.5, ls: 0.2, color: rgba(C.slate, 1), a: S.breweryA, weight: 600, knock: 1 });
    txt('70 MEN · NO DEATHS', X + 46, Y + 67, { size: 10, ls: 0.2, color: rgba(C.slate, 1), a: S.breweryA, knock: 1 });
    ctx.restore();
  }
  if (S.hampA > 0.01) {
    const X = sx(bs.x), Y = sy(bs.y);
    ctx.save();
    ctx.globalAlpha = S.hampA;
    ctx.strokeStyle = rgba(C.red, 0.72); ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 6]);
    // the widow's water travelled north-east out of frame; the reach runs into
    // clear paper on the right so nothing on the plate has to move aside
    ctx.beginPath();
    ctx.moveTo(X + 14, Y - 10);
    ctx.lineTo(X + 14 + 240 * S.hampReach, Y - 10 - (Y - 10 - 118) * S.hampReach);
    ctx.stroke();
    ctx.setLineDash([]);
    if (S.hampReach > 0.86) {
      const a = S.hampA * (S.hampReach - 0.86) / 0.14;
      txt('HAMPSTEAD',     X + 264, 112, { size: 10.5, ls: 0.2, color: rgba(C.red, 1), a, weight: 600, knock: 1 });
      txt('THREE MILES NORTH', X + 264, 127, { size: 10, ls: 0.2, color: rgba(C.red, 1), a: a * 0.78, knock: 1 });
    }
    ctx.restore();
  }
}

/* the plate shimmers on a coarse step so it reads as film, not a smooth pan */
let plateStep = -1, plateIdx = 0;
function drawPlate() {
  if (!PLATE.ready) return;
  const step = (gsap.ticker.time / 0.072) | 0;
  if (step !== plateStep) { plateStep = step; plateIdx = (Math.random() * 4) | 0; }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(PLATE.frames[plateIdx], 0, 0);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  if (S.paper <= 0) return;
  ctx.save();
  ctx.globalAlpha = S.paper;
  ctx.drawImage(STOCK, 0, 0);
  drawStreets();
  drawPumps();
  drawChartAxis();
  drawHistAxis();
  drawMarks();
  drawRule();
  drawPeak();
  drawAnnotations();
  drawPlate();
  ctx.restore();
}
gsap.ticker.add(render);

/* ============================================================================
   TYPE
   ========================================================================== */
const LINES = [];
const T = {};
function line(key, text, cls, x, y, opt = {}) {
  const el = document.createElement('div');
  el.className = 'line ' + cls;
  el.style.top = y + 'px';
  const chars = [];
  for (const ch of text) {
    const m = document.createElement('span');   // clipping box
    m.className = 'm';
    const s = document.createElement('span');
    s.className = 'c';
    s.textContent = ch === ' ' ? '\u00A0' : ch;
    m.appendChild(s); el.appendChild(m); chars.push(s);
  }
  TYPE.appendChild(el);
  const o = { el, chars, x, y, right: !!opt.right, center: !!opt.center };
  LINES.push(o); T[key] = o;
  return o;
}

function buildType() {
  line('slug1', 'SOHO · CITY OF WESTMINSTER', 'mono slug', 108, 690);
  line('slug2', 'LATE SUMMER, 1854', 'mono slug', 108, 714);
  line('slug3', 'NO SEWER · THIRTEEN PUBLIC PUMPS · EVERY DROP CARRIED BY HAND', 'mono slug', 108, 738);

  line('c1',   'FATAL ATTACKS OF CHOLERA, BY DAY', 'mono lbl', 300, 118);
  line('date', '19 AUGUST', 'fr h2', 300, 142);
  line('c2',   '578 MARKS · ONE FOR EACH RECORDED DEATH', 'mono cap', 1330, 812, { right: true });

  line('m1', 'Snow plotted every death', 'fr h2', 936, 214);
  line('m2', 'at the address it happened.', 'fr h2', 936, 270);
  line('m5', 'Then he asked which pump', 'fr h2', 936, 214);
  line('m6', 'each house walked to for water.', 'fr h2', 936, 270);

  line('k1', 'Seventy men worked the brewery', 'fr h3', 936, 452);
  line('k2', 'beside the pump. Not one died.', 'fr h3', 936, 492);
  line('k3', 'They were paid in beer.', 'fr h3 red', 936, 532);
  line('k4', 'A widow in Hampstead had the water', 'fr h3', 936, 452);
  line('k5', 'carted to her. She preferred the taste.', 'fr h3', 936, 492);
  line('k6', 'She died three miles from Soho.', 'fr h3 red', 936, 532);

  line('h1',  'DEATHS BY NEAREST PUMP', 'mono lbl', 255, 196, { center: true });
  line('big', '0', 'fr big', 255, 224, { center: true });
  line('hb1', 'walked to the pump on Broad Street.', 'fr h3', 470, 262);
  line('hb2', 'The other twelve pumps share 219.', 'fr h3 dim', 470, 306);

  line('r1', '8 SEPTEMBER — THE HANDLE WAS REMOVED', 'mono lblr', 300, 118);
  line('r2', 'The attacks had peaked seven days earlier.', 'fr h3', 300, 142);

  line('q1', '“…the attacks had so far diminished', 'fr quote', 800, 330, { center: true });
  line('q2', 'before the use of the water was stopped…”', 'fr quote', 800, 392, { center: true });
  line('q3', 'JOHN SNOW · 1855', 'mono cap', 800, 484, { center: true });

  line('f1', 'The pump handle is the story we tell.', 'fr h3 dim', 936, 330);
  line('f2', 'The map is the one that held.', 'fr h1', 936, 376);
  line('f3', 'THIRTEEN PUMPS', 'mono lbl', 936, 476);
  line('f4', '578 deaths, digitised from John Snow’s 1854 map', 'mono cap', 936, 504);
  line('f5', 'Dodson & Tobler · HistData', 'mono cap', 936, 524);
}

function layout() {
  for (const o of LINES) {
    const w = o.el.offsetWidth;
    o.el.style.left = (o.right ? o.x - w : o.center ? o.x - w / 2 : o.x) + 'px';
  }
}

/* type moves: each returns a sub-timeline so it scrubs with the master ------- */
const IN = {
  rise(o, d = 0.85, stag = 0.014, ease = E.land) {
    const t = gsap.timeline({
      onStart: () => o.el.classList.add('mv'),
      onComplete: () => o.el.classList.remove('mv'),
    });
    t.set(o.el, { autoAlpha: 1 }, 0);
    t.from(o.chars, { yPercent: 64, opacity: 0, duration: d, ease, stagger: { each: stag }, immediateRender: false }, 0);
    return t;
  },
  label(o, d = 0.65) {
    const t = gsap.timeline();
    t.set(o.el, { autoAlpha: 1 }, 0);
    t.from(o.el, { opacity: 0, letterSpacing: '0.44em', duration: d, ease: E.land, immediateRender: false }, 0);
    return t;
  },
};
const OUT = {
  // fast and decisive: a swap must fully clear the line before the next one
  // rises into the same slot, or the two readings sit on top of each other
  lift(o, d = 0.24, stag = 0.004) {
    const t = gsap.timeline({
      onStart: () => o.el.classList.add('mv'),
      onComplete: () => o.el.classList.remove('mv'),
    });
    t.to(o.chars, { yPercent: -36, opacity: 0, duration: d, ease: 'power2.in', stagger: { each: stag } }, 0);
    t.set(o.el, { autoAlpha: 0 });
    t.set(o.chars, { yPercent: 0, opacity: 1 });
    return t;
  },
  fade(o, d = 0.34) { return gsap.to(o.el, { autoAlpha: 0, duration: d, ease: 'power1.in' }); },
};
const fadeAll = (keys, d) => keys.map(k => OUT.fade(T[k], d));

/* variable-font weight tween */
function vf(el, from, to, dur, ease) {
  const st = { v: from };
  return gsap.to(st, {
    v: to, duration: dur, ease, immediateRender: false,
    onUpdate() { el.style.fontVariationSettings = `'opsz' 144,'wght' ${st.v | 0},'SOFT' 0,'WONK' 1`; },
  });
}

/* ============================================================================
   THE FILM
   ========================================================================== */
let master;
const replayBtn = document.getElementById('replay');

function build() {
  const tl = gsap.timeline({ paused: true, onComplete: () => replayBtn.classList.add('on') });

  tl.call(() => { replayBtn.classList.remove('on'); lastDay = -1; }, null, 0);
  tl.set(S, {
    paper: 0, cx: 11.65, cy: 10.98, k: 60, ox: W / 2, oy: H / 2, shakeX: 0, shakeY: 0,
    streetProg: 0, streetA: 0, pumpProg: 0, pumpLabelA: 0, broadRing: 0, broadRingA: 0,
    chartA: 0, chartAxis: 0, dayCursor: -1, chartLabelA: 0, histA: 0, histAxis: 0,
    ruleA: 0, ruleGrow: 0, breweryA: 0, hampA: 0, hampReach: 0,
    mis: 0, tp: 1, markA: 1, peakA: 0, tint: 0, dimFar: 0, mapLock: 0, ruleX: 0,
  }, 0);
  tl.set(P, { a: 0 }, 0);
  tl.set(TYPE.querySelectorAll('.line'), { autoAlpha: 0 }, 0);
  tl.set(TYPE.querySelectorAll('.c'), { yPercent: 0, opacity: 1 }, 0);
  tl.set(T.big.el, { fontVariationSettings: "'opsz' 144,'wght' 250,'SOFT' 0,'WONK' 1" }, 0);

  /* ================ 1 · THE STREET ─────────────────────── 0.0 → 2.9 ====== */
  tl.to(S, { paper: 1, duration: 0.5, ease: 'power1.out' }, 0.12)
    .to(S, { streetA: 1, duration: 0.55, ease: 'power1.out' }, 0.18)
    .to(S, { streetProg: 1, duration: 2.35, ease: 'power1.inOut' }, 0.22)
    .to(S, { k: 63.5, duration: 3.2, ease: E.cam }, 0.2);

  tl.add(IN.label(T.slug1, 0.75), 0.7)
    .add(IN.label(T.slug2, 0.75), 0.88)
    .add(IN.label(T.slug3, 0.75), 1.42);

  /* ================ 2 · THE CURVE ──────────────────────── 2.9 → 8.5 ====== */
  tl.add(fadeAll(['slug1', 'slug2', 'slug3'], 0.28), 2.66);
  tl.to(S, { streetA: 0, duration: 0.3, ease: 'power2.in' }, 2.72);
  tl.set(S, { streetProg: 0 }, 3.04);

  tl.to(S, { chartA: 1, duration: 0.01 }, 3.06)
    .to(S, { chartAxis: 1, duration: 0.8, ease: E.land }, 3.06)
    .to(S, { chartLabelA: 1, duration: 0.55, ease: 'power1.out' }, 3.5);
  tl.add(IN.label(T.c1, 0.55), 3.12);

  // the date readout is driven by the mark cursor itself, so the label and the
  // marks can never drift apart across the five eased segments below
  tl.set(T.date.el, { autoAlpha: 1 }, 3.3);

  // marks stack day by day: sparse through August, then the collapse
  tl.set(S, { dayCursor: -1 }, 3.3);
  tl.to(S, { dayCursor: 11.2, duration: 1.45, ease: 'power1.in',  onUpdate: chartTick }, 3.34)
    .to(S, { dayCursor: 13.0, duration: 0.46, ease: 'power2.in',  onUpdate: chartTick }, 4.79)
    .to(S, { dayCursor: 14.0, duration: 0.38, ease: E.slam,       onUpdate: chartTick }, 5.25)   // 1 SEP — the slam
    .to(S, { dayCursor: 17.5, duration: 0.9,  ease: 'power1.out', onUpdate: chartTick }, 5.70)
    .to(S, { dayCursor: 43,   duration: 1.45, ease: 'power2.out', onUpdate: chartTick }, 6.55);

  tl.to(S, { mis: 1, duration: 0.05, ease: 'none' }, 5.28)
    .to(S, { mis: 0, duration: 0.46, ease: 'power2.out' }, 5.35);
  tl.to(S, {
    duration: 0.4, ease: 'none', immediateRender: false,
    onUpdate() {
      const p = 1 - this.progress();
      S.shakeX = (Math.random() - 0.5) * 7 * p * p;
      S.shakeY = (Math.random() - 0.5) * 5 * p * p;
    },
    onComplete() { S.shakeX = S.shakeY = 0; },
  }, 5.29);
  tl.to(S, { peakA: 1, duration: 0.5, ease: E.land }, 5.55);
  tl.add(IN.label(T.c2, 0.6), 7.12);

  /* ========= 3 · MATCH CUT — THE CURVE BECOMES THE MAP ─── 8.1 → 9.5 ===== */
  tl.add(() => {
    S.cx = 13.0; S.cy = 11.6; S.k = 58; S.ox = 512; S.oy = 452;
    setFrom(); toMap();
    arc(155, p => (p.mx < bs.x ? -1 : 1));
    delays(p => 1 - p.cy_ / CHART.yb, 0.42);     // the top of the curve releases first
  }, null, 8.07);
  tl.set(S, { mapLock: 1 }, 8.09);
  tl.fromTo(S, { tp: 0 }, { tp: 1, duration: 1.65, ease: 'none' }, 8.10);

  tl.add(fadeAll(['c1', 'c2', 'date'], 0.26), 8.05);
  tl.to(S, { peakA: 0, duration: 0.22, ease: 'power1.in' }, 8.05)
    .to(S, { chartAxis: 0, chartA: 0, chartLabelA: 0, duration: 0.36, ease: 'power2.in' }, 8.07);

  tl.set(S, { streetProg: 1 }, 8.35);
  tl.to(S, { streetA: 0.85, duration: 0.95, ease: 'power1.out' }, 8.50)
    .to(S, { k: 59.6, duration: 3.4, ease: E.cam }, 8.55);

  /* ================ 4 · THE MAP ────────────────────────── 9.5 → 15.9 ==== */
  tl.add(IN.rise(T.m1, 0.85), 9.50)
    .add(IN.rise(T.m2, 0.85), 9.65);

  tl.to(S, { pumpProg: 1, duration: 1.15, ease: E.land }, 10.60)
    .to(S, { pumpLabelA: 1, duration: 0.7, ease: 'power1.out' }, 10.95);

  tl.add([OUT.lift(T.m1), OUT.lift(T.m2)], 11.60);
  tl.add(IN.rise(T.m5, 0.8), 12.05)
    .add(IN.rise(T.m6, 0.8), 12.19);

  // the two controls that make it an argument rather than a coincidence
  tl.to(S, { breweryA: 1, duration: 0.7, ease: E.land }, 12.55);
  tl.add(IN.rise(T.k1, 0.72, 0.010), 12.60)
    .add(IN.rise(T.k2, 0.72, 0.010), 12.73)
    .add(IN.rise(T.k3, 0.72, 0.014), 13.03);

  tl.add([OUT.lift(T.k1), OUT.lift(T.k2), OUT.lift(T.k3)], 13.93);
  tl.to(S, { breweryA: 0, duration: 0.28, ease: 'power2.in' }, 13.93);

  tl.to(S, { hampA: 1, duration: 0.25 }, 14.37)
    .fromTo(S, { hampReach: 0 }, { hampReach: 1, duration: 0.9, ease: E.land }, 14.37);
  tl.add(IN.rise(T.k4, 0.72, 0.010), 14.41)
    .add(IN.rise(T.k5, 0.72, 0.010), 14.54)
    .add(IN.rise(T.k6, 0.72, 0.014), 14.84);

  /* ================ 5 · THE SORT ───────────────────────── 16.0 → 20.7 === */
  tl.add(fadeAll(['m5', 'm6', 'k4', 'k5', 'k6'], 0.3), 15.95);
  tl.to(S, { hampA: 0, duration: 0.3, ease: 'power2.in' }, 15.95)
    .to(S, { streetA: 0, duration: 0.55, ease: 'power2.in' }, 16.03)
    .to(S, { pumpLabelA: 0, pumpProg: 0, duration: 0.45, ease: 'power2.in' }, 16.07);

  tl.set(S, { mapLock: 0 }, 16.21);
  tl.add(() => {
    setFrom(); toHist();
    arc(125, p => (p.hx_ < p.ax ? 1 : -1));
    delays(p => p.hrow / HIST.maxRows, 0.6);   // short columns land first; Broad St keeps climbing
  }, null, 16.21);
  tl.to(S, { histA: 1, duration: 0.01 }, 16.23)
    .to(S, { histAxis: 1, duration: 0.95, ease: E.land }, 16.27)
    .fromTo(S, { tp: 0 }, { tp: 1, duration: 2.25, ease: 'none' }, 16.25);
  tl.to(S, { tint: 1, duration: 1.0, ease: 'power1.inOut' }, 16.31);
  tl.add(IN.label(T.h1, 0.55), 16.61);

  // the number resolves as the column tops out
  const cnt = { v: 0 };
  tl.set(T.big.el, { autoAlpha: 1 }, 17.55);
  tl.from(T.big.el, { opacity: 0, duration: 0.28, immediateRender: false }, 17.55);
  tl.to(cnt, {
    v: 359, duration: 1.2, ease: E.land, immediateRender: false,
    onUpdate() { T.big.el.textContent = Math.round(cnt.v); },
  }, 17.55);
  tl.add(vf(T.big.el, 250, 640, 1.35, E.land), 17.55);
  tl.from(T.big.el, { y: 16, duration: 1.35, ease: E.land, immediateRender: false }, 17.55);

  tl.add(IN.rise(T.hb1, 0.75, 0.011), 18.50);
  // hold Broad Street back so the eye can weigh the other twelve against it
  tl.to(S, { dimFar: -1, duration: 0.8, ease: 'power1.inOut' }, 19.15);
  tl.add(IN.rise(T.hb2, 0.75, 0.010), 19.43);
  tl.to(S, { dimFar: 0, duration: 0.6, ease: 'power1.out' }, 20.25);

  /* ================ 6 · THE HANDLE ─────────────────────── 20.8 → 23.9 == */
  tl.add(fadeAll(['h1', 'big', 'hb1', 'hb2'], 0.3), 20.75);
  tl.to(S, { histAxis: 0, duration: 0.42, ease: 'power2.in' }, 20.79)
    .to(S, { histA: 0, duration: 0.42, ease: 'power2.in' }, 20.85);

  tl.add(() => {
    setFrom(); toChart();
    arc(115, p => (p.day > 14 ? 1 : -1));
    delays(p => p.day / DAYS.length, 0.55);   // sweeps left to right, in time order
  }, null, 20.97);
  tl.to(S, { tint: 0, duration: 0.6, ease: 'power1.inOut' }, 20.97);
  tl.fromTo(S, { tp: 0 }, { tp: 1, duration: 1.6, ease: 'none' }, 20.99);
  tl.to(S, { chartA: 1, duration: 0.01 }, 20.99)
    .to(S, { chartAxis: 1, chartLabelA: 1, duration: 0.85, ease: E.land }, 21.05);

  // the rule lands on 8 September — on a column that is already almost nothing
  tl.set(S, { ruleX: CHART.x0 + 20 * CHART.pitch + CHART.pitch / 2 }, 22.20);
  tl.to(S, { ruleA: 1, duration: 0.18 }, 22.25)
    .fromTo(S, { ruleGrow: 0 }, { ruleGrow: 1, duration: 0.65, ease: E.slam }, 22.25);
  tl.add(IN.label(T.r1, 0.5), 22.37);
  tl.to(S, { peakA: 1, duration: 0.55, ease: E.land }, 22.70);
  tl.add(IN.rise(T.r2, 0.8, 0.011), 23.00);

  /* ================ 7 · THE VERDICT ────────────────────── 23.9 → 26.3 == */
  tl.add(fadeAll(['r1', 'r2'], 0.32), 23.90);
  tl.to(S, { markA: 0.15, duration: 0.85, ease: 'power2.inOut' }, 23.90)
    .to(S, { chartAxis: 0, chartLabelA: 0, ruleA: 0, peakA: 0, duration: 0.55, ease: 'power2.in' }, 23.90);

  tl.add(IN.rise(T.q1, 0.95, 0.010), 24.30)
    .add(IN.rise(T.q2, 0.95, 0.010), 24.50)
    .add(IN.label(T.q3, 0.6), 25.45);

  /* ================ 8 · FINAL FRAME ────────────────────── 26.4 → 29.9 == */
  tl.add(fadeAll(['q1', 'q2', 'q3'], 0.42), 26.35);
  tl.add(() => {
    S.cx = 13.0; S.cy = 11.6; S.k = 59; S.ox = 512; S.oy = 452;
    setFrom(); toMap();
    arc(45);
    delays(p => p.jit, 0.5);
  }, null, 26.50);
  tl.set(S, { mapLock: 1 }, 26.52);
  tl.fromTo(S, { tp: 0 }, { tp: 1, duration: 1.55, ease: 'none' }, 26.53);
  tl.to(S, { markA: 1, duration: 1.05, ease: 'power1.out' }, 26.60)
    .to(S, { chartA: 0, duration: 0.35 }, 26.53);
  tl.set(S, { streetProg: 1 }, 26.60);
  tl.to(S, { streetA: 0.62, duration: 1.05, ease: 'power1.out' }, 26.70)
    .to(S, { pumpProg: 1, duration: 0.75, ease: E.land }, 26.90)
    .to(S, { tint: 1, duration: 0.95, ease: 'power1.inOut' }, 26.90)
    .to(S, { k: 60.4, duration: 2.9, ease: E.cam }, 26.60);
  tl.to(S, { broadRingA: 0.85, duration: 0.28 }, 27.30)
    .fromTo(S, { broadRing: 0 }, { broadRing: 0.16, duration: 0.85, ease: E.land }, 27.30);

  tl.add(IN.rise(T.f1, 0.85, 0.011), 27.50)
    .add(IN.rise(T.f2, 1.0, 0.017), 27.90);
  tl.add(IN.label(T.f3, 0.6), 28.65)
    .add(IN.label(T.f4, 0.6), 28.82)
    .add(IN.label(T.f5, 0.6), 28.94);

  tl.to({}, { duration: 0.7 }, 29.15);   // hold before the replay control offers itself
  return tl;
}

/* ---------- boot ----------------------------------------------------------- */
replayBtn.addEventListener('click', () => { replayBtn.classList.remove('on'); master.restart(); });

document.fonts.ready.then(() => {
  buildType();
  requestAnimationFrame(() => {
    layout();
    master = build();
    master.play(0);
  });
});
