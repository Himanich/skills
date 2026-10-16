import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '#src/cli.mjs';

const sink = () => ({ buf: '', write(c) { this.buf += c; return true; } });

function run(args, { sessions = [] } = {}) {
  const calls = [];
  const rec = (n, ret) => (...a) => (calls.push([n, ...a]), ret);
  const driver = {
    ensureAvailable: rec('ensureAvailable'),
    open: rec('open'),
    list: () => sessions,
    evaluate: rec('evaluate', 'http://x/'),
    cdp: rec('cdp', { ok: 1 }),
  };
  const stdout = sink();
  const stderr = sink();
  const deps = { stdout, stderr, env: {}, driverFactory: () => driver };
  return runCli(['node', 'web', ...args], deps).then((code) => ({ code, calls, stdout }));
}

test('browser eval without session exits 2 NO_SESSION', async () => {
  const { code, stdout } = await run(['browser', 'eval', '1']);
  assert.equal(code, 2);
  assert.equal(JSON.parse(stdout.buf).error.code, 'NO_SESSION');
});

test('browser open prints { session, url, headed }', async () => {
  const { code, stdout, calls } = await run(['browser', 'open', 'http://x', '--session', 's']);
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(stdout.buf), { session: 's', url: 'http://x', headed: false });
  assert.equal(calls.find((c) => c[0] === 'open')[1].session, 's');
});

test('browser cdp parses params json and forwards', async () => {
  const sessions = [{ name: 's', status: 'open' }];
  const { stdout, calls } = await run(
    ['browser', 'cdp', 'Page.x', '{"a":1}', '--session', 's'],
    { sessions },
  );
  assert.deepEqual(calls.find((c) => c[0] === 'cdp'), ['cdp', 's', 'Page.x', { a: 1 }]);
  assert.deepEqual(JSON.parse(stdout.buf), { result: { ok: 1 } });
});

test('browser cdp with invalid json exits 2 USAGE', async () => {
  const sessions = [{ name: 's', status: 'open' }];
  const { code } = await run(['browser', 'cdp', 'M', '{bad', '--session', 's'], { sessions });
  assert.equal(code, 2);
});

test('browser list adds url for open sessions only', async () => {
  const sessions = [
    { name: 'a', status: 'open', headed: false },
    { name: 'b', status: 'closed', headed: false },
  ];
  const { stdout } = await run(['browser', 'list'], { sessions });
  assert.deepEqual(JSON.parse(stdout.buf).sessions.map((s) => s.url), ['http://x/', null]);
});
