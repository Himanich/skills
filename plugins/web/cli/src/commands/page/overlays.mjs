import { CliError } from '#src/errors.mjs';
import { loadBundle } from '#src/bundles/index.mjs';
import { runPageCommand } from '#src/page/run.mjs';
import { buildBundle, buildHideExpression, loadPatterns } from '#src/page/overlay-db.mjs';

const MODES = ['quick', 'thorough'];

const RESIDUAL_EXPRESSION = `JSON.stringify([...document.querySelectorAll('*')].filter(el => { var s = getComputedStyle(el); var r = el.getBoundingClientRect(); return s.position === 'fixed' && parseInt(s.zIndex, 10) > 1000 && (el.offsetWidth > 100 || el.offsetHeight > 100) && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight; }).map(el => { var s = getComputedStyle(el); return { tag: el.tagName, id: el.id, cls: (el.className || '').slice(0, 50), z: s.zIndex, w: el.offsetWidth, h: el.offsetHeight }; }))`;

const parseMaybe = (data) => (typeof data === 'string' ? JSON.parse(data) : data);

/**
 * Detect overlays on the current page.
 * @param {object} driver
 * @param {string} session
 * @param {object} patterns overlay pattern database
 * @returns {object} `{ overlays, scroll_locked, scroll_fix? }`
 */
export function detectOverlays(driver, session, patterns) {
  const source = buildBundle(patterns, loadBundle('overlay-detect.js'));
  const code = `async page => page.evaluate(${JSON.stringify(source)})`;
  return parseMaybe(driver.run(session, { code }));
}

function stepCode(step) {
  if (step.action === 'click') {
    const sel = JSON.stringify(step.selector);
    return `await page.locator(${sel}).first().click({ timeout: 2000 }).catch(() => {});`;
  }
  return `await page.waitForTimeout(${Number(step.ms)});`;
}

function runDismissSteps(driver, session, overlay) {
  const body = overlay.dismiss.map(stepCode).join('\n');
  try {
    driver.run(session, { code: `async page => {\n${body}\nreturn true;\n}` });
    return { id: overlay.id, strategy: 'dismiss', ok: true };
  } catch {
    return { id: overlay.id, strategy: 'dismiss', ok: false };
  }
}

function hideOverlays(driver, session, report, overlays) {
  const ids = overlays.map((o) => o.id);
  driver.evaluate(session, buildHideExpression(report, ids));
  return overlays.map((o) => ({ id: o.id, strategy: 'hide', ok: true }));
}

function dismissThorough(driver, session, report) {
  const hasSteps = (o) => o.dismiss?.length > 0;
  const dismissed = report.overlays.filter(hasSteps)
    .map((o) => runDismissSteps(driver, session, o));
  const toHide = report.overlays.filter((o) => !hasSteps(o));
  return [...dismissed, ...hideOverlays(driver, session, report, toHide)];
}

/**
 * Dismiss or hide the detected overlays, then fix scroll lock.
 * @param {object} driver
 * @param {string} session
 * @param {object} report detection report
 * @param {{ mode: 'quick'|'thorough' }} spec
 * @returns {Array<{ id: string, strategy: string, ok: boolean }>}
 */
export function dismissOverlays(driver, session, report, { mode }) {
  if (mode === 'quick') {
    driver.evaluate(session, buildHideExpression(report, ['all']));
    return report.overlays.map((o) => ({ id: o.id, strategy: 'hide', ok: true }));
  }
  return dismissThorough(driver, session, report);
}

function residualBlockers(driver, session) {
  const code = `async page => page.evaluate(${JSON.stringify(RESIDUAL_EXPRESSION)})`;
  return parseMaybe(driver.run(session, { code }));
}

/**
 * Register `page overlays [url]`.
 * @param {import('commander').Command} group
 * @param {object} deps
 */
export function registerOverlays(group, deps) {
  group
    .command('overlays [url]')
    .description('detect cookie banners and modals; optionally dismiss them')
    .option('--dismiss', 'dismiss or hide the detected overlays')
    .option('--mode <mode>', `dismissal mode: ${MODES.join(', ')}`, 'quick')
    .option('--refresh-db', 'refresh the overlay pattern database first')
    .action((url, opts, command) => {
      if (!MODES.includes(opts.mode)) {
        throw new CliError('USAGE', `unknown mode ${opts.mode}`, {
          hint: `one of: ${MODES.join(', ')}`,
        });
      }
      return runPageCommand(command, deps, {
        url,
        fn: async (driver, session) => {
          const patterns = await loadPatterns({
            refresh: opts.refreshDb,
            fetch: deps.fetch,
            cacheDir: deps.cacheDir,
            stderr: deps.stderr,
          });
          const report = detectOverlays(driver, session, patterns);
          const result = {
            overlays: report.overlays,
            scrollLocked: report.scroll_locked,
            scrollFix: report.scroll_fix ?? null,
          };
          if (!opts.dismiss) return result;
          result.applied = dismissOverlays(driver, session, report, { mode: opts.mode });
          result.residual = residualBlockers(driver, session);
          return result;
        },
      });
    });
}
