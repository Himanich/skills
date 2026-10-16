import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '#src/cli.mjs';

const sink = () => ({ buf: '', write(c) { this.buf += c; return true; } });
const OK = { title: 'T', url: 'http://x/final', bodyLength: 5000, status: 200, hasMainContent: true };
const REPORT = {
  overlays: [
    { id: 'overlay-0', type: 'cmp-match', cmp: 'acme', selector: '#acme',
      hide: ['#acme-hide { display:none!important }'],
      dismiss: [{ action: 'click', selector: '#acme-save' }, { action: 'wait', ms: 250 }] },
    { id: 'overlay-1', type: 'heuristic', selector: '.modal',
      hide: ['.modal-hide { display:none!important }'], dismiss: null },
  ],
  scroll_locked: true,
  scroll_fix: 'html { overflow:auto!important }',
};

async function run(extra, { runFails = false } = {}) {
  const calls = [];
  const fetchUrls = [];
  const driver = {
    ensureAvailable: () => {}, open: () => {}, close: () => {}, list: () => [],
    goto: () => {}, inject: () => {}, pageHealth: () => OK,
    run: (s, o) => {
      calls.push(['run', o.code]);
      if (runFails && !o.code.includes('page.evaluate(') && !o.code.includes('r.right > 0')) throw new Error('boom');
      if (o.code.includes('r.right > 0')) return '[]';
      return o.code.includes('page.evaluate(') ? JSON.stringify(REPORT) : true;
    },
    evaluate: (s, expr) => (calls.push(['evaluate', expr]), 'ok'),
  };
  const fetch = async (url) => {
    fetchUrls.push(url);
    return url.endsWith('.json')
      ? { ok: true, json: async () => ({}) }
      : { ok: true, text: async () => '##.x\n' };
  };
  const stdout = sink();
  const stderr = sink();
  const cacheDir = mkdtempSync(join(tmpdir(), 'ov-'));
  const deps = { stdout, stderr, env: {}, driverFactory: () => driver, fetch, cacheDir };
  const out = mkdtempSync(join(tmpdir(), 'ovo-'));
  const code = await runCli(['node', 'web', 'page', 'overlays', ...extra, '--output', out], deps);
  return { code, calls, fetchUrls, doc: stdout.buf ? JSON.parse(stdout.buf) : null };
}

const hides = (calls) => calls.filter((c) => c[0] === 'evaluate');

test('report shape has overlays[] and scrollLocked', async () => {
  const { code, doc, calls } = await run(['http://x']);
  assert.equal(code, 0);
  assert.equal(doc.overlays.length, 2);
  assert.equal(doc.scrollLocked, true);
  assert.equal(doc.scrollFix, REPORT.scroll_fix);
  assert.equal(doc.applied, undefined);
  assert.equal(hides(calls).length, 0);
});

test('quick mode issues one hide expression with all hide CSS', async () => {
  const { doc, calls } = await run(['http://x', '--dismiss', '--mode', 'quick']);
  const h = hides(calls);
  assert.equal(h.length, 1);
  assert.match(h[0][1], /#acme-hide/);
  assert.match(h[0][1], /\.modal-hide/);
  assert.deepEqual(doc.applied, [
    { id: 'overlay-0', strategy: 'hide', ok: true },
    { id: 'overlay-1', strategy: 'hide', ok: true },
  ]);
  assert.deepEqual(doc.residual, []);
});

test('thorough runs dismiss steps for cmp-match and hides the heuristic one', async () => {
  const { doc, calls } = await run(['http://x', '--dismiss', '--mode', 'thorough']);
  const steps = calls.filter((c) => c[0] === 'run' && c[1].includes('#acme-save'));
  assert.equal(steps.length, 1);
  assert.match(steps[0][1], /waitForTimeout\(250\)/);
  const h = hides(calls);
  assert.equal(h.length, 1);
  assert.match(h[0][1], /\.modal-hide/);
  assert.doesNotMatch(h[0][1], /#acme-hide/);
  assert.match(h[0][1], /overflow:auto/);
  assert.deepEqual(doc.applied, [
    { id: 'overlay-0', strategy: 'dismiss', ok: true },
    { id: 'overlay-1', strategy: 'hide', ok: true },
  ]);
});

test('thorough marks a failed dismiss run ok:false', async () => {
  const { code, doc } = await run(['http://x', '--dismiss', '--mode', 'thorough'],
    { runFails: true });
  assert.equal(code, 0);
  assert.equal(doc.applied[0].ok, false);
});

test('invalid --mode exits 2 without driver calls', async () => {
  const { code, calls } = await run(['http://x', '--dismiss', '--mode', 'bogus']);
  assert.equal(code, 2);
  assert.deepEqual(calls, []);
});

test('--refresh-db triggers fetch; default fetches on empty cache too', async () => {
  const { fetchUrls } = await run(['http://x', '--refresh-db']);
  assert.equal(fetchUrls.length, 2);
});
