#!/usr/bin/env node
'use strict';

// context-window-fit — offline token estimate vs. model context windows.
// Usage:
//   cat prompt.txt | context-window-fit --model claude-sonnet-5
//   context-window-fit --window 128000 < prompt.txt
//   context-window-fit --compare < prompt.txt

const fs = require('node:fs');
const { estimateTokens, MODELS, fitStatus } = require('../src/fit.js');

const fmt = (n) => n.toLocaleString('en-US');
const BADGE = { green: 'FITS', yellow: 'TIGHT', red: "WON'T FIT" };

function usage() {
  return [
    'Usage: context-window-fit [--model <id>] [--window <tokens>] [--compare] [file]',
    '',
    'Options:',
    '  --model <id>     model id (default: claude-sonnet-5)',
    '  --window <n>     custom context window in tokens (overrides --model)',
    '  --compare        show the estimate against every known model',
    '  -h, --help       show this help',
    '',
    'Known models: ' + MODELS.map((m) => m.id).join(', '),
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { model: 'claude-sonnet-5', window: null, compare: false, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { opts.help = true; continue; }
    if (a === '--compare') { opts.compare = true; continue; }
    if (a === '--model') { opts.model = argv[++i]; continue; }
    if (a === '--window') { opts.window = parseInt(argv[++i], 10); continue; }
    if (a.startsWith('-')) { throw new Error('unknown flag: ' + a); }
    opts.file = a;
  }
  return opts;
}

function readInput(file) {
  if (file) return fs.readFileSync(file, 'utf8');
  return fs.readFileSync(0, 'utf8'); // stdin
}

function report(model, window, tokens) {
  const s = fitStatus(tokens, window);
  const badge = BADGE[s.level] + (s.over ? ' — OVERFLOW' : '');
  return [
    model + '  (' + fmt(window) + ' tokens)',
    '  Estimated tokens: ' + fmt(tokens),
    '  ' + badge + ' — ' + s.pct + '% of window',
  ].join('\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return; }

  const text = readInput(opts.file);
  const tokens = estimateTokens(text, { dense: opts.file && /\.(json|csv|xml|ya?ml|toml|sql|[jt]s|py)$/i.test(opts.file) });

  if (opts.compare) {
    console.log('Estimated tokens: ' + fmt(tokens) + '\n');
    for (const m of MODELS) {
      const s = fitStatus(tokens, m.window);
      console.log(BADGE[s.level].padEnd(9) + '  ' + String(s.pct).padStart(5) + '%  ' + m.label + ' (' + fmt(m.window) + ')');
    }
    return;
  }

  let window = opts.window;
  let modelLabel = 'Custom window';
  if (!window) {
    const m = MODELS.find((x) => x.id === opts.model);
    if (!m) {
      throw new Error('unknown model: "' + opts.model + '"\nKnown models: ' + MODELS.map((x) => x.id).join(', '));
    }
    window = m.window;
    modelLabel = m.label;
  }
  console.log('Model: ' + modelLabel);
  console.log('Context window: ' + fmt(window));
  console.log(report(modelLabel, window, tokens).split('\n').slice(1).join('\n'));
  if (fitStatus(tokens, window).level !== 'green') {
    console.log('\nTip: trim oldest chat history first — it is usually the fattest expendable chunk.');
  }
}

try {
  main();
} catch (e) {
  console.error('context-window-fit: ' + e.message);
  process.exit(1);
}
