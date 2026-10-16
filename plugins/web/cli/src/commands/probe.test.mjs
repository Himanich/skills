import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '#src/cli.mjs';

const OK = { title: 'Home', url: 'http://x/', bodyLength: 500, status: 200, hasMainContent: true };
const BAD = { title: 'Access Denied', url: 'http://x/', bodyLength: 10, status: 403 };
const sink = () => ({
  buf: '',
  write(c) {
    this.buf += c;
    return true;
  },
});

function run(healths) {
  const out = mkdtempSync(join(tmpdir(), 'probe-test-'));
  const calls = [];
  const opened = [];
  let n = 0;
  const driver = {
    ensureAvailable() {},
    open(a) {
      opened.push({ ...a, initExisted: (a.initScripts ?? []).map((p) => existsSync(p)) });
    },
    evaluate: () => 'complete',
    pageHealth: () => healths[Math.min(n++, healths.length - 1)],
    requests: () => '1. [GET] http://x/ => [200] OK',
    responseHeaders: () => 'server: nginx\ncf-ray: abc',
    close: (s) => calls.push(s),
  };
  const stdout = sink();
  const stderr = sink();
  const deps = { stdout, stderr, env: {}, driverFactory: () => driver };
  return runCli(['node', 'web', 'probe', 'http://x/', '--output', out], deps).then((code) => ({
    code,
    out,
    opened,
    closed: calls,
    stdout,
    stderr,
  }));
}

test('stops at first successful step and writes recipe for it', async () => {
  const r = await run([BAD, OK]);
  assert.equal(r.code, 0);
  const { report, recipePath } = JSON.parse(r.stdout.buf);
  assert.equal(report.firstSuccess, 'stealth');
  assert.equal(report.steps.length, 2);
  assert.ok(report.detectedSignals.includes('cloudflare-ray'));
  const recipe = JSON.parse(readFileSync(recipePath, 'utf-8'));
  const cfg = r.opened[1].config;
  const { initScript, ...rest } = recipe.cliConfig.browser;
  assert.deepEqual(rest, cfg);
  assert.equal(recipe.persistent, false);
  assert.equal(cfg.browserName, 'chromium');
  assert.ok(existsSync(initScript[0]));
  assert.match(r.stderr.buf, /Probing with default config/);
});

test('all steps blocked → BLOCKED exit 3, report still written', async () => {
  const r = await run([BAD]);
  assert.equal(r.code, 3);
  assert.equal(JSON.parse(r.stdout.buf).error.code, 'BLOCKED');
  assert.ok(existsSync(join(r.out, 'probe-probe-report.json')));
  assert.equal(r.opened.length, 5);
  assert.equal(r.opened[4].persistent, true);
  assert.equal(r.opened[3].config.launchOptions.channel, 'chrome');
  assert.match(r.opened[2].config.launchOptions.args[0], /^--user-agent=Mozilla/);
});

test('each step closes its session and removes the stealth file', async () => {
  const r = await run([BAD, BAD, OK]);
  assert.equal(r.closed.length, 3);
  assert.deepEqual(
    r.closed,
    r.opened.map((o) => o.session),
  );
  const stealth = r.opened[1].initScripts[0];
  assert.equal(r.opened[1].initExisted[0], true);
  assert.equal(existsSync(stealth), false);
});
