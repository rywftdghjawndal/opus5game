# Thirteen Pumps

A ~30 second motion piece about the 1854 Broad Street cholera outbreak, and the
map John Snow drew of it.

Open `index.html` in a browser. No build step, no server, no keys.

## What it is

578 marks. Each one is a real recorded death, digitised from Snow's map by
Dodson & Tobler and published in the `HistData` R package. The same 578 marks
move between three views of the same event and never stop being the same
people:

1. the daily fatal-attack curve — 143 on 1 September alone
2. the street map, where each death sits at the address it happened
3. a ranking by nearest pump — 359 to Broad Street, 219 to the other twelve

Then the film does the thing the popular version of this story leaves out: the
pump handle came off on 8 September, a week *after* the peak. Snow said so
himself in 1855. The handle is the story we tell; the map is the argument that
actually held.

## Building

`index.html` is generated and committed, so the repository is usable without
any tooling. To change it, edit the sources and rebuild:

```
node tools/prep.mjs    # assets/*.csv  ->  tools/data.blob.js
node tools/build.mjs   # src/* + blob  ->  index.html
```

- `src/film.js` — canvas renderer and the GSAP master timeline
- `src/style.css` — type and page styling
- `src/index.tpl.html` — shell, fonts, CDN script tags
- `tools/prep.mjs` — parses the CSVs, computes nearest-pump assignment
- `tools/qa.sh`, `tools/render.py` — frame-stepped screenshot / video capture

The nearest-pump counts the piece displays reproduce the published table
exactly (359 / 64 / 61 / 27 / 24 / 16 / 12 / 6 / 4 / 2 / 2 / 1 / 0).

## Source

Dodson & Tobler's digitisation of John Snow's 1854 map, via the `HistData`
package. Quotation from Snow's *On the Mode of Communication of Cholera*, 1855.
