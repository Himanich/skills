import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CliError } from '#src/errors.mjs';

/** @returns {string} `web-` plus 4 hex characters */
export function generateSessionName() {
  return `web-${randomBytes(2).toString('hex')}`;
}

/** @param {{ session?: string }} opts */
export function resolveSession(opts) {
  return opts.session ?? process.env.WEB_SESSION;
}

/**
 * Read a probe recipe file.
 * @param {string} recipePath
 * @returns {{ config: object, persistent: boolean }}
 */
export function loadRecipe(recipePath) {
  let recipe;
  try {
    recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
  } catch (err) {
    throw new CliError('USAGE', `cannot read recipe ${recipePath}: ${err.message}`, {
      hint: 'produce one with: web probe <url>',
    });
  }
  return { config: recipe?.cliConfig?.browser, persistent: recipe?.persistent === true };
}

/**
 * @param {object} driver
 * @param {string | undefined} name
 */
export function requireOpenSession(driver, name) {
  const open = name && driver.list().some((s) => s.name === name && s.status === 'open');
  if (!open) {
    throw new CliError('NO_SESSION', `no open session${name ? ` named ${name}` : ''}`, {
      hint: 'run: web browser open <url> --session <name>',
    });
  }
}

/**
 * Run `fn` against a given open session, or against an ephemeral one closed afterwards.
 * @param {object} driver
 * @param {{ session?: string, url?: string, headed?: boolean, recipePath?: string }} opts
 * @param {(session: string) => unknown} fn
 */
export async function withSession(driver, { session, url, headed, recipePath }, fn) {
  if (session) {
    requireOpenSession(driver, session);
    if (url) driver.goto(session, url);
    return fn(session);
  }
  const name = generateSessionName();
  const recipe = recipePath ? loadRecipe(recipePath) : {};
  driver.open({ session: name, url, headed, ...recipe });
  const signals = ['SIGINT', 'SIGTERM'];
  const handlers = signals.map((signal) => {
    const handler = () => {
      cleanup();
      try {
        driver.close(name);
      } catch {
        // best effort: the process is being killed anyway
      }
      process.kill(process.pid, signal);
    };
    return [signal, handler];
  });
  const cleanup = () => handlers.forEach(([s, h]) => process.removeListener(s, h));
  handlers.forEach(([s, h]) => process.once(s, h));
  try {
    return await fn(name);
  } finally {
    cleanup();
    driver.close(name);
  }
}

/** @returns {string} `<outputDir>/<session>-<command>-<name>` */
export function artifactPath(outputDir, session, command, name) {
  return join(outputDir, `${session}-${command}-${name}`);
}
