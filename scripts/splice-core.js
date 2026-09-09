#!/usr/bin/env node
'use strict';
// Injects src/fit.js verbatim into index.html between the FIT-CORE markers.
// test/web.test.js asserts the embedded copy matches src/fit.js exactly.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const htmlPath = path.join(ROOT, 'index.html');
const corePath = path.join(ROOT, 'src', 'fit.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const core = fs.readFileSync(corePath, 'utf8');

// Strip the node-only export guard from the embedded copy? No — sibling
// convention embeds the file verbatim; the guard is inert in the browser.
const re = /(\/\* FIT-CORE-BEGIN \*\/)\n[\s\S]*?(\/\* FIT-CORE-END \*\/)/;
if (!re.test(html)) {
  console.error('FIT-CORE markers not found in index.html');
  process.exit(1);
}
// Result lands the core verbatim between the markers, one newline each side,
// matching the web.test.js extraction pattern.
fs.writeFileSync(htmlPath, html.replace(re, (_m, open, close) => open + '\n' + core.trim() + '\n' + close));
console.log('spliced src/fit.js into index.html');
