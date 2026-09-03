// Builds the inlined data blob for index.html from the HistData/Snow CSVs
// (Dodson & Tobler's digitization of John Snow's 1854 map).
import fs from 'node:fs';

const csv = (p) => {
  const [head, ...rows] = fs.readFileSync(p, 'utf8').trim().split('\n');
  const cols = head.split(',');
  return rows.map((r) => {
    // naive split is fine: only Snow.pumps has quoted-free labels w/o commas
    const v = r.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, v[i]]));
  });
};

const deaths = csv('assets/Snow.deaths.csv').map((d) => ({ x: +d.x, y: +d.y }));
const pumps = csv('assets/Snow.pumps.csv').map((d) => ({ label: d.label, x: +d.x, y: +d.y }));
const streetsRaw = csv('assets/Snow.streets.csv');
const dates = csv('assets/Snow.dates.csv').filter((d) => d.date).map((d) => ({
  date: d.date, attacks: +d.attacks, deaths: +d.deaths,
}));

// group street vertices into polylines by street id
const byStreet = new Map();
for (const r of streetsRaw) {
  const id = r.street;
  if (!byStreet.has(id)) byStreet.set(id, []);
  byStreet.get(id).push([+r.x, +r.y]);
}
const streets = [...byStreet.values()];

// nearest pump (euclidean, map units)
const counts = new Array(pumps.length).fill(0);
const assign = deaths.map((d) => {
  let best = 0, bd = Infinity;
  pumps.forEach((p, i) => {
    const dx = d.x - p.x, dy = d.y - p.y, dd = dx * dx + dy * dy;
    if (dd < bd) { bd = dd; best = i; }
  });
  counts[best]++;
  return best;
});

// distance of each pump from Broad St (pump index 6) -- candidate column order
const bs = pumps[6];
const dist = pumps.map((p, i) => ({
  i, label: p.label, n: counts[i],
  d: Math.hypot(p.x - bs.x, p.y - bs.y),
}));
console.log('\nby distance from Broad St:');
dist.slice().sort((a, b) => a.d - b.d)
  .forEach((p) => console.log(p.d.toFixed(2).padStart(6), String(p.n).padStart(4), p.label));

const bounds = (pts) => pts.reduce((a, p) => ({
  x0: Math.min(a.x0, p[0] ?? p.x), x1: Math.max(a.x1, p[0] ?? p.x),
  y0: Math.min(a.y0, p[1] ?? p.y), y1: Math.max(a.y1, p[1] ?? p.y),
}), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });

console.log('deaths', deaths.length, bounds(deaths));
console.log('streets polylines', streets.length, 'verts', streetsRaw.length, bounds(streetsRaw.map(r => [+r.x, +r.y])));
console.log('pumps', bounds(pumps));
console.log('total deaths in dates table', dates.reduce((a, d) => a + d.deaths, 0),
            'attacks', dates.reduce((a, d) => a + d.attacks, 0));
console.log('\nnearest-pump counts (computed):');
pumps.map((p, i) => [p.label, counts[i]]).sort((a, b) => b[1] - a[1])
  .forEach(([l, c]) => console.log(String(c).padStart(4), l));

// --- emit compact blob ---
// quantize to 3dp, encode as delta-free fixed strings
const q = (n) => Math.round(n * 1000);
const D = deaths.map((d) => `${q(d.x)},${q(d.y)}`).join(' ');
const S = streets.map((s) => s.map((p) => `${q(p[0])},${q(p[1])}`).join(' ')).join('|');
const P = pumps.map((p) => `${p.label};${q(p.x)};${q(p.y)}`).join('|');
const A = assign.join('');  // 0-9 + a-d for 10..12
const A2 = assign.map((i) => i.toString(36)).join('');
const T = dates.map((d) => `${d.date.slice(5)},${d.attacks},${d.deaths}`).join('|');

const out = `const RAW = {
  D: ${JSON.stringify(D)},
  S: ${JSON.stringify(S)},
  P: ${JSON.stringify(P)},
  A: ${JSON.stringify(A2)},
  T: ${JSON.stringify(T)}
};`;
fs.writeFileSync('tools/data.blob.js', out);
console.log('\nblob bytes', out.length);
