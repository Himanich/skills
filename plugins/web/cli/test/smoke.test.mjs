import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixture } from './fixture-server.mjs';

const binPath = fileURLToPath(new URL('../bin/web.mjs', import.meta.url));
const HTML = '<html><head><title>Smoke</title></head><body><h1>hi</h1></body></html>';
const probe = spawnSync('playwright-cli', ['--version']);
const available = !probe.error && probe.status === 0;
const sessionName = `smoke-${process.pid}`;
let cwd;
let fixture;

// Async spawn: spawnSync would block the event loop that serves the in-process fixture.
function web(...args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [binPath, ...args], { encoding: 'utf8', cwd }, (err, stdout, stderr) => {
      resolve({ status: err ? err.code : 0, doc: JSON.parse(stdout), stderr });
    });
  });
}

before(async () => {
  if (!available) return;
  cwd = mkdtempSync(join(tmpdir(), 'web-smoke-'));
  fixture = await startFixture(HTML);
});

after(async () => {
  if (!available) return;
  await web('browser', 'close', '--session', sessionName);
  await fixture.close();
});

test('open → eval → list → close leaves no session', async (t) => {
  if (!available) return t.skip('playwright-cli not installed');
  const opened = await web('browser', 'open', fixture.url, '--session', sessionName);
  assert.equal(opened.status, 0, opened.stderr);
  assert.equal(opened.doc.session, sessionName);

  const title = await web('browser', 'eval', '--session', sessionName, 'document.title');
  assert.equal(title.status, 0, title.stderr);
  assert.equal(JSON.stringify(title.doc).includes('Smoke'), true);

  const listed = await web('browser', 'list');
  assert.match(JSON.stringify(listed.doc), new RegExp(sessionName));

  assert.equal((await web('browser', 'close', '--session', sessionName)).status, 0);
  assert.doesNotMatch(JSON.stringify((await web('browser', 'list')).doc), new RegExp(sessionName));
});

test('ephemeral page command cleans up after failure', async (t) => {
  if (!available) return t.skip('playwright-cli not installed');
  const res = await web('browser', 'eval', '--session', 'does-not-exist', '1');
  assert.equal(res.status, 2);
  assert.equal(res.doc.error.code, 'NO_SESSION');
});
