import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

const m = html.match(/\/\*<computeHype>\*\/([\s\S]*?)\/\*<\/computeHype>\*\//);
if (!m) throw new Error('computeHype markers not found in index.html');

// computeHype depends only on this trivial helper; define it for the sandbox.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// Turn the function declaration into an expression and evaluate it.
const computeHype = eval('(' + m[1].trim().replace(/^function\s+computeHype/, 'function') + ')');

const bass   = { rarity: 'common',    minLen: 9,  maxLen: 21 };
const salmon = { rarity: 'rare',      minLen: 18, maxLen: 36 };
const musky  = { rarity: 'legendary', minLen: 30, maxLen: 52 };

test('small common -> tier 0', () => {
  assert.equal(computeHype(bass, { len: 9 }).tier, 0);
});
test('mid common -> tier 1', () => {
  assert.equal(computeHype(bass, { len: 15 }).tier, 1);
});
test('huge common -> tier 3 (lunker)', () => {
  assert.equal(computeHype(bass, { len: 21 }).tier, 3);
});
test('rare small -> tier 2', () => {
  assert.equal(computeHype(salmon, { len: 20 }).tier, 2);
});
test('rare big -> tier 3', () => {
  assert.equal(computeHype(salmon, { len: 34 }).tier, 3);
});
test('legendary always tier 3', () => {
  assert.equal(computeHype(musky, { len: 30 }).tier, 3);
});
test('hype h stays within [0,1] and sizePct is reported', () => {
  const r = computeHype(musky, { len: 52 });
  assert.ok(r.h >= 0 && r.h <= 1);
  assert.ok(r.sizePct >= 0 && r.sizePct <= 1);
});
