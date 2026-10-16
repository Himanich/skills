import { execFileSync } from 'node:child_process';
import { killHeadedBrowsers } from './headless.mjs';

/** Closes the playwright-cli browser a run left open (named by metadata.runId), after its assertions ran. */
export async function extensionHook(hookName, context) {
  if (hookName === 'beforeEach') killHeadedBrowsers();
  if (hookName !== 'afterEach') return;
  killHeadedBrowsers();
  const runId = context.result?.response?.metadata?.runId;
  if (!runId) return;
  const session = `run-${runId}`;
  for (const cmd of ['close', 'delete-data']) {
    try {
      execFileSync('playwright-cli', [`-s=${session}`, cmd], { stdio: 'ignore', timeout: 30_000 });
    } catch {
      // session was never opened or is already gone
    }
  }
  closeEphemeralWebSessions();
}

/** The web CLI closes its own ephemeral `web-*` sessions; close any it could not (best effort). */
function closeEphemeralWebSessions() {
  try {
    const { browsers = [] } = JSON.parse(execFileSync('playwright-cli', ['list', '--json'], { encoding: 'utf-8', timeout: 30_000 }));
    for (const { name } of browsers.filter((b) => b.name?.startsWith('web-'))) {
      execFileSync('playwright-cli', [`-s=${name}`, 'close'], { stdio: 'ignore', timeout: 30_000 });
    }
  } catch {
    // playwright-cli missing, no sessions, or already closed
  }
}
