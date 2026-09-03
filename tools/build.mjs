// Assembles index.html from src/ parts + the data blob.
import fs from 'node:fs';

const blob = fs.readFileSync('tools/data.blob.js', 'utf8');
const html = fs.readFileSync('src/index.tpl.html', 'utf8');
const css = fs.readFileSync('src/style.css', 'utf8');
const js = fs.readFileSync('src/film.js', 'utf8');

const out = html
  .replace('/*__CSS__*/', () => css)
  .replace('/*__DATA__*/', () => blob)
  .replace('/*__JS__*/', () => js);

fs.writeFileSync('index.html', out);
console.log('index.html', (out.length / 1024).toFixed(1), 'KB');
