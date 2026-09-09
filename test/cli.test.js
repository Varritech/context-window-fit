'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const BIN = path.join(__dirname, '..', 'bin', 'context-window-fit.js');

// execFile's `input` option is silently ignored for async spawns — pipe stdin
// manually via child.stdin.end() or the suite hangs forever.
function runCli(args, stdinText) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIN, ...args]);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, err }));
    child.stdin.end(stdinText || '');
  });
}

test('reads the prompt from stdin and prints tokens, window, and badge', async () => {
  const r = await runCli(['--model', 'claude-sonnet-5'], 'hello word'); // 10 chars -> 3 tokens
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Estimated tokens: 3/);
  assert.match(r.out, /Context window: 200,000/);
  assert.match(r.out, /FITS/);
});

test('--window sets a custom context window', async () => {
  const r = await runCli(['--window', '10'], 'x'.repeat(40)); // 10 tokens vs 10 -> 100% -> red
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Context window: 10/);
  assert.match(r.out, /WON.?T FIT/);
});

test('--compare prints every known model with the same estimate', async () => {
  const r = await runCli(['--compare'], 'hello word');
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /GPT-4o/);
  assert.match(r.out, /Claude — Sonnet 5/);
  assert.match(r.out, /Gemini — 2.5 Pro/);
});

test('unknown --model exits 1 with a helpful error', async () => {
  const r = await runCli(['--model', 'nope-9000'], 'hi');
  assert.equal(r.code, 1);
  assert.match(r.err, /unknown model/i);
  assert.match(r.err, /claude-sonnet-5/);
});
