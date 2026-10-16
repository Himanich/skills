import { loadBundle } from '#src/bundles/index.mjs';
import { preparePage } from '#src/page/prepare.mjs';
import { runPageCommand } from '#src/page/run.mjs';

/**
 * Capture the visual tree of the current page.
 * @returns {{ text: string, tree: object, nodeMap: object, rootBackground: string }}
 */
export function captureTree(driver, session, { minWidth = 900, settleMs } = {}) {
  preparePage(driver, session, { settleMs });
  driver.inject(session, loadBundle('page-tree.js'));
  let raw = driver.evaluate(
    session,
    `JSON.stringify(window.__visualTree.captureVisualTree(${Number(minWidth)}))`,
  );
  if (typeof raw === 'string') raw = JSON.parse(raw);
  return {
    text: raw.textFormat, tree: raw.data, nodeMap: raw.nodeMap, rootBackground: raw.rootBackground,
  };
}

/**
 * Register `page tree [url]`.
 * @param {import('commander').Command} group
 * @param {object} deps
 */
export function registerTree(group, deps) {
  group
    .command('tree [url]')
    .description('capture the visual tree of a page')
    .option('--min-width <n>', 'minimum element width in px', Number, 900)
    .option('--settle-ms <n>', 'wait after scrolling for lazy content', Number, 2000)
    .action((url, _opts, command) => runPageCommand(command, deps, {
      url,
      fn: (driver, session, opts) => captureTree(driver, session, opts),
    }));
}
