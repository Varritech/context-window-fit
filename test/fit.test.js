'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

test('estimateTokens counts plain text at ~4 chars per token', () => {
  const { estimateTokens } = require('../src/fit.js');
  assert.equal(estimateTokens('hello word'), 3); // 10 chars -> ceil(10/4)
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
});

test('estimateTokens rates dense structured text (JSON/code) higher than prose', () => {
  const { estimateTokens } = require('../src/fit.js');
  const json = '{"a":1,"b":2,"c":3,"d":4,"e":5}'; // 31 chars
  const prose = estimateTokens(json);
  const dense = estimateTokens(json, { dense: true });
  assert.ok(dense > prose, 'dense flag must increase the estimate');
});

test('MODELS lists ChatGPT, Claude, and Gemini entries with numeric context windows', () => {
  const { MODELS } = require('../src/fit.js');
  assert.ok(Array.isArray(MODELS) && MODELS.length >= 6, 'need at least 6 models');
  const labels = MODELS.map((m) => m.label.toLowerCase()).join(' ');
  assert.ok(labels.includes('gpt'), 'must include a ChatGPT/GPT model');
  assert.ok(labels.includes('claude'), 'must include a Claude model');
  assert.ok(labels.includes('gemini'), 'must include a Gemini model');
  for (const m of MODELS) {
    assert.equal(typeof m.id, 'string');
    assert.equal(typeof m.label, 'string');
    assert.ok(Number.isInteger(m.window) && m.window >= 8000, `${m.id} window must be a sane integer`);
  }
});

test('fitStatus maps usage to green/yellow/red bands and flags overflow', () => {
  const { fitStatus } = require('../src/fit.js');
  const W = 100000;
  assert.equal(fitStatus(0, W).level, 'green');
  assert.equal(fitStatus(59999, W).level, 'green');
  assert.equal(fitStatus(60000, W).level, 'yellow');
  assert.equal(fitStatus(84999, W).level, 'yellow');
  assert.equal(fitStatus(85000, W).level, 'red');
  assert.equal(fitStatus(100000, W).level, 'red');
  assert.equal(fitStatus(120000, W).level, 'red');
  assert.equal(fitStatus(120000, W).over, true);
  assert.equal(fitStatus(50000, W).over, false);
  // pct is rounded to one decimal place
  assert.equal(fitStatus(50000, W).pct, 50);
  assert.equal(fitStatus(33333, W).pct, 33.3);
});

test('trimToFit drops oldest messages first until total is under the target ratio', () => {
  const { trimToFit } = require('../src/fit.js');
  const msg = (n) => ({ role: 'user', content: 'x'.repeat(n * 4) }); // ~n tokens + overhead
  const messages = [msg(1000), msg(1000), msg(1000), msg(1000), msg(1000)];
  // window 8000, 2000 fixed tokens outside history, target 85% -> budget 6800
  const r = trimToFit({ messages, fixedTokens: 2000, window: 8000, targetRatio: 0.85 });
  assert.equal(r.dropped.length, 1, 'dropping the single oldest message gets under budget');
  assert.deepEqual(r.dropped.map((m) => m.role), ['user']);
  assert.equal(r.kept.length, 4);
  assert.ok(r.newTotal <= 6800, `newTotal ${r.newTotal} must be <= 6800`);
  assert.ok(r.newTotal > 6800 - 1010, 'must not drop more than necessary');
  assert.equal(r.kept[0].content.length, 4000);
});

test('trimToFit reports stillOver when the prompt alone busts the budget', () => {
  const { trimToFit } = require('../src/fit.js');
  const r = trimToFit({
    messages: [{ role: 'user', content: 'hi' }],
    fixedTokens: 9000,
    window: 8000,
    targetRatio: 0.85,
  });
  assert.equal(r.kept.length, 0, 'all history dropped');
  assert.equal(r.stillOver, true, 'fixed prompt alone still exceeds the budget');
});

test('estimateFileTokens uses text content when given, byte size otherwise', () => {
  const { estimateFileTokens } = require('../src/fit.js');
  // text content: plain prose estimate
  assert.equal(estimateFileTokens('notes.txt', 400, 'x'.repeat(400)), 100);
  // dense extension: JSON estimated denser than prose
  assert.ok(estimateFileTokens('data.json', 400, 'x'.repeat(400)) > 100);
  // binary (no text): estimated from byte size, still positive
  assert.ok(estimateFileTokens('deck.pdf', 100000, null) > 0);
});
