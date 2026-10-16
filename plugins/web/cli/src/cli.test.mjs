import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CliError } from './errors.mjs';
import { createProgram, runCli } from './cli.mjs';

const sink = () => ({ buf: '', write(c) { this.buf += c; return true; } });

test('unknown option exits 2 and prints help to stderr', async () => {
  const stdout = sink();
  const stderr = sink();
  const argv = ['node', 'web', 'browser', 'list', '--headless'];
  const code = await runCli(argv, { stdout, stderr, env: {} });
  assert.equal(code, 2);
  assert.match(stderr.buf, /Usage:/);
});

test('--help exits 0 and lists groups browser, page, probe, ext, mask', async () => {
  const stdout = sink();
  const code = await runCli(['node', 'web', '--help'], { stdout, stderr: sink(), env: {} });
  assert.equal(code, 0);
  for (const g of ['browser', 'page', 'probe', 'ext', 'mask']) {
    assert.match(stdout.buf, new RegExp(g));
  }
});

test('WEB_SESSION env fills --session default', () => {
  const program = createProgram({ env: { WEB_SESSION: 'from-env' } });
  assert.equal(program.opts().session, 'from-env');
});

test('mask prints its own help and exit 0', async () => {
  for (const g of ['mask']) {
    const stdout = sink();
    const code = await runCli(['node', 'web', g], { stdout, stderr: sink(), env: {} });
    assert.equal(code, 0);
    assert.match(stdout.buf, /Usage:/);
  }
});

const thrower = (err) => (program) =>
  program.command('boom').action(() => {
    throw err;
  });

test('a CliError thrown by a command yields its error document and exit code', async () => {
  const stdout = sink();
  const registerTestCommands = thrower(new CliError('BLOCKED', 'm', { hint: 'h' }));
  const code = await runCli(['node', 'web', 'boom'], {
    stdout, stderr: sink(), env: {}, registerTestCommands,
  });
  assert.equal(code, 3);
  assert.deepEqual(JSON.parse(stdout.buf), { error: { code: 'BLOCKED', message: 'm', hint: 'h' } });
});

test('a plain Error is wrapped as INTERNAL with exit 1', async () => {
  const stdout = sink();
  const registerTestCommands = thrower(new Error('boom'));
  const code = await runCli(['node', 'web', 'boom'], {
    stdout, stderr: sink(), env: {}, registerTestCommands,
  });
  assert.equal(code, 1);
  assert.equal(JSON.parse(stdout.buf).error.code, 'INTERNAL');
});
