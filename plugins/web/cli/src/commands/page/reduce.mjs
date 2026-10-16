import { CliError } from '#src/errors.mjs';
import { loadBundle } from '#src/bundles/index.mjs';
import { preparePage, scrollForLazyContent } from '#src/page/prepare.mjs';
import { runPageCommand } from '#src/page/run.mjs';

const DETECT = 'window.xp.detectSections(document.body, window, { autoDetect: true, '
  + 'highlightBoxes: false, highlightSections: false })'
  + '.then(() => JSON.stringify(window.__reduceForSkill(document.body, window)))';

function detect(driver, session) {
  const raw = driver.evaluate(session, DETECT);
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

/**
 * Phase 1 of page reduce: detect sections, retrying after scrolling when none are found.
 * @returns {{ url: string, title: string, viewport: object, templateHash: string,
 *   sections: object[] }}
 */
export function reducePage(driver, session, { retries = 2, settleMs } = {}) {
  preparePage(driver, session, { unpin: true, settleMs });
  driver.inject(session, loadBundle('page-reduce.js'));
  let phase1 = detect(driver, session);
  for (let i = 0; i < retries && !phase1.sections?.length; i += 1) {
    scrollForLazyContent(driver, session, settleMs === undefined ? {} : { settleMs });
    phase1 = detect(driver, session);
  }
  if (!phase1.sections?.length) {
    throw new CliError('EMPTY_RESULT', `no sections detected after ${retries} retries`, {
      hint: 'page did not finish rendering; retry with --headed or a longer --settle-ms',
    });
  }
  return phase1;
}

/**
 * Register `page reduce [url]`. Printed document is phase1 plus url (from page health),
 * session and durationMs.
 * @param {import('commander').Command} group
 * @param {object} deps
 */
export function registerReduce(group, deps) {
  group
    .command('reduce [url]')
    .description('detect page sections (phase 1 of page reduction)')
    .option('--settle-ms <n>', 'wait after scrolling for lazy content', Number, 2000)
    .option('--retries <n>', 'rescroll attempts when no sections are found', Number, 2)
    .action((url, _opts, command) => runPageCommand(command, deps, {
      url,
      fn: (driver, session, opts) => reducePage(driver, session, {
        retries: opts.retries, settleMs: opts.settleMs,
      }),
    }));
}
