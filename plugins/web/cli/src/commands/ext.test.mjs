import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '#src/cli.mjs';

const MANIFEST = {
  manifest_version: 3,
  name: 'X',
  version: '1.0',
  side_panel: { default_path: 'panel.html' },
  action: { default_popup: 'popup.html' },
};
const sink = () => ({ buf: '', write(c) { this.buf += c; return true; } });

function setup({ manifest = MANIFEST, sessions = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ext-test-'));
  const dist = join(root, 'dist');
  mkdirSync(dist);
  if (manifest) writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest));
  const calls = [];
  const rec = (n, ret) => (...a) => (calls.push([n, ...a]), ret);
  const driver = {
    ensureAvailable: rec('ensureAvailable'),
    open: rec('open'),
    list: () => sessions,
    close: rec('close'),
    run: rec('run', 'chrome-extension://abcdef/'),
    cdp: rec('cdp', {}),
  };
  const stdout = sink();
  const deps = { stdout, stderr: sink(), env: {}, driverFactory: () => driver };
  const exec = (args) =>
    runCli(['node', 'web', '--output', root, ...args], deps).then((code) => ({ code, calls, stdout }));
  return { root, dist, exec, stdout };
}

test('ext launch prints { session, cdpPort, extensionId, surfaces }', async () => {
  const { dist, exec, stdout, root } = setup();
  const { code, calls } = await exec(['ext', 'launch', dist, '--session', 's', '--cdp-port', '9333']);
  assert.equal(code, 0);
  const out = JSON.parse(stdout.buf);
  assert.deepEqual(out.surfaces, ['sidepanel', 'popup']);
  assert.equal(out.extensionId, 'abcdef');
  assert.equal(out.cdpPort, 9333);
  const opened = calls.find((c) => c[0] === 'open')[1];
  assert.equal(opened.headed, true);
  assert.equal(opened.persistent, true);
  assert.deepEqual(opened.config.launchOptions.args, [
    `--load-extension=${dist}`,
    `--disable-extensions-except=${dist}`,
  ]);
  assert.ok(existsSync(join(root, 's-ext-session.json')));
});

test('ext launch with missing manifest exits 2 without opening', async () => {
  const { dist, exec, root } = setup({ manifest: null });
  const { code, calls } = await exec(['ext', 'launch', dist]);
  assert.equal(code, 2);
  assert.equal(calls.find((c) => c[0] === 'open'), undefined);
  assert.ok(root);
});

async function launched(opts) {
  const ctx = setup({ ...opts, sessions: [{ name: 's', status: 'open' }] });
  await ctx.exec(['ext', 'launch', ctx.dist, '--session', 's']);
  ctx.stdout.buf = '';
  ctx.exec.calls = null;
  return ctx;
}

test('ext open rejects a surface not in the manifest (USAGE)', async () => {
  const { exec, stdout } = await launched();
  const { code } = await exec(['ext', 'open', 'options', '--session', 's']);
  assert.equal(code, 2);
  assert.equal(JSON.parse(stdout.buf).error.code, 'USAGE');
});

test('ext open popup runs code containing the popup path', async () => {
  const { exec, stdout, root } = await launched();
  const { code, calls } = await exec(['ext', 'open', 'popup', '--session', 's']);
  assert.equal(code, 0);
  const runs = calls.filter((c) => c[0] === 'run');
  assert.match(runs.at(-1)[2].code, /chrome-extension:\/\/abcdef\/popup\.html/);
  assert.deepEqual(JSON.parse(stdout.buf), { surface: 'popup', url: 'chrome-extension://abcdef/' });
  assert.ok(root);
});

test('ext open without a session file exits NO_SESSION', async () => {
  const { exec, stdout } = setup({ sessions: [{ name: 's', status: 'open' }] });
  const { code } = await exec(['ext', 'open', 'popup', '--session', 's']);
  assert.equal(code, 2);
  assert.equal(JSON.parse(stdout.buf).error.code, 'NO_SESSION');
});

test('ext status reports open:false when the session is gone', async () => {
  const { exec, stdout } = setup();
  const { code } = await exec(['ext', 'status', '--session', 's']);
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(stdout.buf), {
    session: 's', open: false, extensionId: null, surfaces: null,
  });
});

test('ext close removes the session file', async () => {
  const { exec, stdout, root } = await launched();
  const { code } = await exec(['ext', 'close', '--session', 's']);
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(stdout.buf), { session: 's', status: 'closed' });
  assert.equal(existsSync(join(root, 's-ext-session.json')), false);
});
