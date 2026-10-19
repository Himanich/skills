import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./overlay-detect.js', import.meta.url), 'utf8');
const mod = { exports: {} };
new Function('module', source)(mod);
const { heuristicScan } = mod.exports;

const el = (over = {}) => ({
  id: '',
  className: '',
  tagName: 'DIV',
  parentElement: null,
  ownerDocument: { querySelectorAll: () => [1] },
  getAttribute: (n) => over.attrs?.[n] ?? null,
  getBoundingClientRect: () => over.rect ?? { width: 1440, height: 900 },
  matches: () => false,
  style: { position: 'fixed', zIndex: '100', display: 'block', visibility: 'visible', ...over.style },
  ...over.props,
});

const scan = (elements) => {
  globalThis.getComputedStyle = (e) => e.style;
  const doc = {
    documentElement: { clientWidth: 1440, clientHeight: 900 },
    querySelectorAll: () => elements,
  };
  try { return heuristicScan(doc, [], [], false); } finally { delete globalThis.getComputedStyle; }
};

test('full-viewport fixed div at z-index 100 without keywords is detected', () => {
  const [hit] = scan([el({ props: { className: 'fixed inset-0' } })]);
  assert.ok(hit.signals.includes('full-cover'));
});

test('full-viewport fixed div at z-index auto is not detected', () => {
  assert.deepEqual(scan([el({ style: { zIndex: 'auto' } })]), []);
});

test('small fixed bar without other signals is not detected', () => {
  assert.deepEqual(scan([el({ rect: { width: 1440, height: 60 } })]), []);
});

test('hidden aria-modal element is skipped', () => {
  const attrs = { 'aria-modal': 'true' };
  const props = { id: 'modal-refund-policy' };
  assert.deepEqual(scan([el({ attrs, props, style: { display: 'none' } })]), []);
  assert.deepEqual(scan([el({ attrs, props, rect: { width: 0, height: 0 } })]), []);
  assert.equal(scan([el({ attrs, props })]).length, 1);
});
