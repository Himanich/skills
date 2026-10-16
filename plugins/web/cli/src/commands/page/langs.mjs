import { loadBundle } from '#src/bundles/index.mjs';
import { detectLanguages, loadDetector } from '#src/page/langs-detect.mjs';
import { runPageCommand } from '#src/page/run.mjs';

/**
 * Register `page langs [url]`. The detector loads before the browser opens,
 * so a missing cld3-asm fails fast.
 * @param {import('commander').Command} group
 * @param {object} deps
 */
export function registerLangs(group, deps) {
  group
    .command('langs [url]')
    .description('detect page languages (CLD3) and compare with declared lang signals')
    .action(async (url, _opts, command) => {
      const detector = await (deps.loadDetector ?? loadDetector)();
      return runPageCommand(command, deps, {
        url,
        fn: (driver, session) => detectLanguages(
          driver.run(session, { code: loadBundle('langs-collect.js') }), detector,
        ),
      });
    });
}
