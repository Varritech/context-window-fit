'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('index.html embeds the exact src/fit.js core so the page can never drift from the CLI', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const core = fs.readFileSync(path.join(ROOT, 'src', 'fit.js'), 'utf8');
  const m = html.match(/\/\* FIT-CORE-BEGIN \*\/\n([\s\S]*?)\n\/\* FIT-CORE-END \*\//);
  assert.ok(m, 'index.html must contain FIT-CORE markers');
  assert.equal(m[1], core.trim());
});

test('index.html is fully self-contained — no external scripts, styles, or fonts', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.equal(/<script[^>]+src=/i.test(html), false, 'no external <script src>');
  assert.equal(/<link[^>]+href=/i.test(html), false, 'no external <link href>');
  assert.equal(/src="https?:/i.test(html), false, 'no remote assets');
  assert.equal(/@import/i.test(html), false, 'no CSS @import');
});

test('index.html is responsive at mobile width — viewport meta and a mobile media query', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(/<meta name="viewport" content="width=device-width/.test(html), 'viewport meta required');
  assert.ok(/@media \(max-width:/.test(html), 'mobile media query required');
  assert.equal(/style="[^"]*width:\s*\d{3,}px/i.test(html), false, 'no inline fixed pixel widths');
});

test('index.html uses the Varritech brand tokens', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('#07040D'), 'near-black background token required');
  assert.ok(html.includes('#80FF00'), 'lime accent token required');
});

test('index.html exposes the trim-oldest-messages control', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(/id="trimBtn"/.test(html), 'trim button required');
  assert.ok(/Trim oldest messages/i.test(html), 'trim button must say what it does');
});
