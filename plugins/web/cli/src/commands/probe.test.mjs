import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
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
  assert.ok(isAbsolute(initScript[0]));
  assert.ok(existsSync(initScript[0]));
  assert.match(r.stderr.buf, /Probing with default config/);
});

test('all steps blocked → BLOCKED exit 3, report still written', async () => {
  const r = await run([BAD]);
  assert.equal(r.code, 3);
  assert.equal(JSON.parse(r.stdout.buf).error.code, 'BLOCKED');
  assert.ok(existsSync(join(r.out, readdirSync(r.out)[0], 'probe-report.json')));
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

test('a step whose open fails yields an error step and closes the session', async () => {
  const out = mkdtempSync(join(tmpdir(), 'probe-test-'));
  const closed = [];
  const driver = {
    ensureAvailable() {},
    open() {
      throw new Error('launch failed');
    },
    close: (s) => closed.push(s),
  };
  const deps = { stdout: sink(), stderr: sink(), env: {}, driverFactory: () => driver };
  const code = await runCli(['node', 'web', 'probe', 'http://x/', '--output', out], deps);
  assert.equal(code, 3);
  assert.equal(closed.length, 5);
  const report = JSON.parse(
    readFileSync(join(out, readdirSync(out)[0], 'probe-report.json'), 'utf8'),
  );
  assert.ok(
    report.steps.every((s) => s.result === 'error' && /launch failed/.test(s.health.error)),
  );
});

test('--session or --recipe exits 2 USAGE without opening a browser', async () => {
  for (const extra of [
    ['--session', 'x'],
    ['--recipe', 'r.json'],
  ]) {
    const out = mkdtempSync(join(tmpdir(), 'probe-test-'));
    let opens = 0;
    const driver = { ensureAvailable() {}, open: () => (opens += 1) };
    const stdout = sink();
    const deps = { stdout, stderr: sink(), env: {}, driverFactory: () => driver };
    const argv = ['node', 'web', 'probe', 'http://x/', '--output', out, ...extra];
    assert.equal(await runCli(argv, deps), 2);
    assert.equal(JSON.parse(stdout.buf).error.code, 'USAGE');
    assert.equal(opens, 0);
  }
});

test('WEB_SESSION in the environment is also rejected', async () => {
  const stdout = sink();
  const driver = { ensureAvailable() {}, open() {} };
  const deps = { stdout, stderr: sink(), env: { WEB_SESSION: 'x' }, driverFactory: () => driver };
  assert.equal(await runCli(['node', 'web', 'probe', 'http://x/'], deps), 2);
});

test('--headed reaches every driver.open', async () => {
  const out = mkdtempSync(join(tmpdir(), 'probe-test-'));
  const opened = [];
  const driver = {
    ensureAvailable() {},
    open: (a) => opened.push(a),
    evaluate: () => 'complete',
    pageHealth: () => BAD,
    requests: () => '',
    responseHeaders: () => '',
    close() {},
  };
  const deps = { stdout: sink(), stderr: sink(), env: {}, driverFactory: () => driver };
  await runCli(['node', 'web', 'probe', 'http://x/', '--output', out, '--headed'], deps);
  assert.equal(opened.length, 5);
  assert.ok(opened.every((o) => o.headed === true));
});
