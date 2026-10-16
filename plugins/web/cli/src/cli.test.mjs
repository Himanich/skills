import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgram, runCli } from './cli.mjs';

const sink = () => ({ buf: '', write(c) { this.buf += c; return true; } });

test('unknown option exits 2 and prints help to stderr', async () => {
  const stdout = sink();
  const stderr = sink();
  const code = await runCli(['node', 'web', 'browser', 'list', '--headless'], { stdout, stderr, env: {} });
  assert.equal(code, 2);
  assert.match(stderr.buf, /Usage:/);
});

test('--help exits 0 and lists groups browser, page, probe, ext, mask', async () => {
  const stdout = sink();
  const code = await runCli(['node', 'web', '--help'], { stdout, stderr: sink(), env: {} });
  assert.equal(code, 0);
  for (const g of ['browser', 'page', 'probe', 'ext', 'mask']) assert.match(stdout.buf, new RegExp(g));
});

test('WEB_SESSION env fills --session default', () => {
  const program = createProgram({ env: { WEB_SESSION: 'from-env' } });
  assert.equal(program.opts().session, 'from-env');
});
