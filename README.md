# Context Window Fit Checker

Paste your full prompt, chat history, attached files, and few-shot examples — and instantly see whether it all actually fits inside your model's context window. A green/yellow/red badge tells you at a glance, and a one-click button trims the oldest chat messages until you're back under the safe zone.

**Fully offline. No account. No API key. Nothing you paste ever leaves your browser.**

## Why

Founders stuffing long PDFs, chat histories, and few-shot examples into ChatGPT, Claude, or Gemini get *silent truncation* or a cryptic "context length exceeded" error — then waste hours debugging why the model "forgot" the first document. This tool makes the invisible visible before you hit send.

## What it does

- **Token estimate** for each part of your payload: system prompt, chat history (per-message), few-shot examples, and attached files (text files are read locally; PDFs/other binaries estimated from size)
- **Live meter**: tokens used vs. your model's context window, with a progress bar and badge — 🟢 FITS (<60%), 🟡 TIGHT (60–85%), 🔴 WON'T FIT (≥85% or over 100%)
- **Trim oldest messages to fit**: one click drops history from the oldest end until you're under the 85% target, and tells you how many tokens it freed
- **Model picker** for ChatGPT (GPT-4o, GPT-4.1, o3), Claude (Sonnet 5, Opus 5, Haiku 4.5), and Gemini (2.5 Pro/Flash), plus a custom window field
- **Per-section breakdown** so you can see what's eating the budget

## Install

It's a single static page — no build step:

```bash
open index.html          # macOS
# or serve it: npx serve .
```

### Optional CLI

```bash
npm install -g .        # or: node bin/context-window-fit.js …
```

## Usage

### Web

1. Pick your model (or type a custom window size)
2. Paste your system prompt, add chat history messages, paste few-shot examples, drop in files
3. Watch the badge — if it's red or yellow, click **Trim oldest messages to fit**

### CLI

```bash
# Check a prompt file against Claude Sonnet 5
context-window-fit --model claude-sonnet-5 prompt.txt

# Custom window
context-window-fit --window 128000 < prompt.txt

# Compare the same prompt across every known model
context-window-fit --compare < prompt.txt
```

### Example

```bash
$ context-window-fit --compare < my-giant-prompt.md
Estimated tokens: 152,340

WON'T FIT    119.0%  ChatGPT — GPT-4o (128,000)
WON'T FIT     76.2%  ChatGPT — o3 (200,000)
WON'T FIT     76.2%  Claude — Sonnet 5 (200,000)
FITS          14.5%  ChatGPT — GPT-4.1 (1,047,576)
…
```

## How the estimate works

~4 characters per token for prose (the standard OpenAI/Anthropic rule of thumb), ~3 for structured text (JSON, code, CSV, YAML). Chat messages carry a 4-token overhead each (role + markup). Binary files estimate from byte size. Real tokenizers vary about ±10% — treat the badge bands as a safety margin, not a precise accounting.

## Development

```bash
npm test        # node --test on test/**/*.test.js
```

`src/fit.js` is the shared estimation engine used verbatim by both the web page (embedded between `FIT-CORE` markers — `scripts/splice-core.js` re-injects it) and the CLI, so the two can never drift apart. `test/web.test.js` enforces that, plus full self-containment and mobile responsiveness of `index.html`.

## License

MIT — see [LICENSE](LICENSE).
