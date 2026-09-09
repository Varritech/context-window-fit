'use strict';

// Offline token estimator. Heuristic: ~4 characters per token for English
// prose (OpenAI/Anthropic rule of thumb). Deliberately conservative on
// structured text (JSON/code/CSV), which tokenizes denser.
function estimateTokens(text, opts) {
  if (!text) return 0;
  const perToken = opts && opts.dense ? 3 : 4;
  return Math.ceil(text.length / perToken);
}

// Common context windows (input + output combined). Keep in sync with
// vendor docs; users can also type a custom window in the UI.
const MODELS = [
  { id: 'gpt-4o', label: 'ChatGPT — GPT-4o', window: 128000 },
  { id: 'gpt-4.1', label: 'ChatGPT — GPT-4.1', window: 1047576 },
  { id: 'o3', label: 'ChatGPT — o3', window: 200000 },
  { id: 'claude-sonnet-5', label: 'Claude — Sonnet 5', window: 200000 },
  { id: 'claude-sonnet-5-1m', label: 'Claude — Sonnet 5 (1M beta)', window: 1000000 },
  { id: 'claude-opus-5', label: 'Claude — Opus 5', window: 200000 },
  { id: 'claude-haiku-4-5', label: 'Claude — Haiku 4.5', window: 200000 },
  { id: 'gemini-2.5-pro', label: 'Gemini — 2.5 Pro', window: 1048576 },
  { id: 'gemini-2.5-flash', label: 'Gemini — 2.5 Flash', window: 1048576 },
];

// Band thresholds: green < 60%, yellow 60–85%, red >= 85% (or over 100%).
// Bands are computed on the raw ratio so rounding can't flip a boundary case.
function fitStatus(used, window) {
  const ratio = window > 0 ? used / window : 1;
  const pct = Math.round(ratio * 1000) / 10;
  const level = ratio >= 0.85 ? 'red' : ratio >= 0.6 ? 'yellow' : 'green';
  return { level, pct, over: used > window };
}

// Chat markup overhead per message (role tokens, separators).
const MESSAGE_OVERHEAD = 4;

function messageTokens(message) {
  return estimateTokens(message && message.content) + MESSAGE_OVERHEAD;
}

// Drop oldest history messages until fixedTokens + history <= window*targetRatio.
// Returns the surviving messages, what was dropped, and whether the remaining
// fixed content alone still busts the budget (nothing left to trim).
function trimToFit({ messages, fixedTokens, window, targetRatio }) {
  const budget = Math.floor(window * (targetRatio || 0.85));
  const kept = Array.isArray(messages) ? messages.slice() : [];
  const dropped = [];
  let total = fixedTokens + kept.reduce((s, m) => s + messageTokens(m), 0);
  while (total > budget && kept.length > 0) {
    const m = kept.shift();
    dropped.push(m);
    total -= messageTokens(m);
  }
  return { kept, dropped, newTotal: total, stillOver: total > budget };
}

const DENSE_EXTENSIONS = ['.json', '.csv', '.xml', '.html', '.js', '.ts', '.py', '.java', '.go', '.rs', '.sql', '.yaml', '.yml', '.toml'];

// File tokens: prefer decoded text; structured formats tokenize denser.
// Binary files (PDFs, docs, images) fall back to a byte-size heuristic —
// extracted PDF text is roughly 1 token per 4 bytes of the raw file.
function estimateFileTokens(name, byteSize, text) {
  if (typeof text === 'string' && text.length > 0) {
    const lower = (name || '').toLowerCase();
    const dense = DENSE_EXTENSIONS.some((ext) => lower.endsWith(ext));
    return estimateTokens(text, { dense });
  }
  return Math.ceil((byteSize || 0) / 4);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { estimateTokens, MODELS, fitStatus, trimToFit, estimateFileTokens, MESSAGE_OVERHEAD, messageTokens };
}
