import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { CliError } from '#src/errors.mjs';
import { createContext } from '#src/context.mjs';
import { artifactPath, generateSessionName } from '#src/session.mjs';
import { loadBundle } from '#src/bundles/index.mjs';
import { checkHealth, detectSignals, findDocumentChain } from '#src/driver/blocked.mjs';

const REALISTIC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' +
  ' AppleWebKit/537.36 (KHTML, like Gecko)' +
  ' Chrome/120.0.0.0 Safari/537.36';

export const STEPS = [
  {
    name: 'default',
    browser: 'chromium',
    stealth: false,
    uaOverride: false,
    persistent: false,
    config: { browser: 'chromium', stealth: false, uaOverride: false },
  },
  {
    name: 'stealth',
    browser: 'chromium',
    stealth: true,
    uaOverride: false,
    persistent: false,
    config: { browser: 'chromium', stealth: true, uaOverride: false },
  },
  {
    name: 'stealth-ua',
    browser: 'chromium',
    stealth: true,
    uaOverride: true,
    persistent: false,
    config: { browser: 'chromium', stealth: true, uaOverride: true },
  },
  {
    name: 'chrome',
    browser: 'chrome',
    stealth: true,
    uaOverride: true,
    persistent: false,
    config: { browser: 'chrome', stealth: true, uaOverride: true },
  },
  {
    name: 'persistent',
    browser: 'chrome',
    stealth: true,
    uaOverride: true,
    persistent: true,
    config: { browser: 'chrome', stealth: true, uaOverride: true },
  },
];

function buildBrowserConfig(stepDef) {
  const launchOptions = {};
  if (stepDef.browser !== 'chromium') launchOptions.channel = stepDef.browser;
  if (stepDef.uaOverride) launchOptions.args = [`--user-agent=${REALISTIC_UA}`];
  return { browserName: 'chromium', launchOptions };
}

function waitForStable(driver, session) {
  for (let i = 0; i < 10; i += 1) {
    if (driver.evaluate(session, 'document.readyState') === 'complete') return;
  }
}

function documentHeaderLines(driver, session, finalUrl) {
  const indices = findDocumentChain(driver.requests(session), finalUrl);
  return indices.flatMap((i) => driver.responseHeaders(session, i).split('\n').filter(Boolean));
}

function collectHeaders(driver, session, health, log) {
  try {
    return { networkLines: documentHeaderLines(driver, session, health.url) };
  } catch (err) {
    const headerError = `Failed to read main-document response headers: ${err.message}`;
    log(`  warning: ${headerError}`);
    return { networkLines: [], headerError };
  }
}

function runStep(driver, { url, outputDir, stepDef, log }) {
  const session = generateSessionName();
  const start = Date.now();
  const stealthPath = artifactPath(outputDir, session, 'probe', 'stealth-init.js');
  const browserConfig = buildBrowserConfig(stepDef);
  const base = { name: stepDef.name, config: stepDef.config };
  try {
    const initScripts = [];
    if (stepDef.stealth) {
      mkdirSync(outputDir, { recursive: true });
      writeFileSync(stealthPath, loadBundle('stealth-init.js'));
      initScripts.push(stealthPath);
    }
    driver.open({
      session,
      url,
      config: browserConfig,
      persistent: stepDef.persistent,
      initScripts,
    });
    waitForStable(driver, session);
    const health = driver.pageHealth(session);
    const result = checkHealth(health);
    const { networkLines, headerError } = collectHeaders(driver, session, health, log);
    const step = { ...base, result, health, durationMs: Date.now() - start };
    if (headerError) step.headerError = headerError;
    return { step, networkLines, browserConfig };
  } catch (err) {
    const health = {
      title: '',
      url: '',
      bodyLength: 0,
      status: 0,
      hasMainContent: false,
      error: err.message,
    };
    const step = { ...base, result: 'error', health, durationMs: Date.now() - start };
    return { step, networkLines: [], browserConfig };
  } finally {
    try {
      driver.close(session);
    } catch (err) {
      log(`  warning: could not close ${session}: ${err.message}`);
    }
    rmSync(stealthPath, { force: true });
  }
}

const HELP = `
Example:
  web probe https://example.com
Output:
  { report: { url, timestamp, steps, firstSuccess, detectedSignals }, recipePath }
Notes:
  Tries default, stealth, stealth-ua, chrome, persistent until a page loads. Writes
  <output>/probe-probe-report.json and probe-probe-recipe.json; pass the recipe to
  other commands with --recipe. Progress goes to stderr.
Exit codes:
  3 BLOCKED when all steps are blocked (no recipe is written).
`;

/**
 * Try each probe step until a page loads unblocked.
 * @returns {{ report: object, recipePath: string|null }}
 */
export function runProbe(driver, { url, outputDir, log = () => {} }) {
  const steps = [];
  const networkLines = [];
  let success = null;
  for (const stepDef of STEPS) {
    log(`Probing with ${stepDef.name} config...`);
    const out = runStep(driver, { url, outputDir, stepDef, log });
    steps.push(out.step);
    networkLines.push(...out.networkLines);
    log(
      `  ${stepDef.name}: ${out.step.result} (${out.step.health.title || 'no title'}, ` +
        `${out.step.durationMs}ms)`,
    );
    if (out.step.result === 'success') {
      success = { stepDef, browserConfig: out.browserConfig };
      break;
    }
  }
  const report = {
    url,
    timestamp: new Date().toISOString(),
    steps,
    firstSuccess: success?.stepDef.name ?? null,
    detectedSignals: detectSignals(
      networkLines,
      steps.map((s) => s.health),
    ),
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    artifactPath(outputDir, 'probe', 'probe', 'report.json'),
    JSON.stringify(report, null, 2),
  );
  if (!success) return { report, recipePath: null };
  const recipePath = artifactPath(outputDir, 'probe', 'probe', 'recipe.json');
  const browser = { ...success.browserConfig };
  if (success.stepDef.stealth) {
    const stealthPath = artifactPath(outputDir, 'probe', 'probe', 'stealth-init.js');
    writeFileSync(stealthPath, loadBundle('stealth-init.js'));
    browser.initScript = [stealthPath];
  }
  const recipe = {
    cliConfig: { browser },
    persistent: success.stepDef.persistent,
  };
  writeFileSync(recipePath, JSON.stringify(recipe, null, 2));
  return { report, recipePath };
}

/**
 * Register `probe <url>`.
 * @param {import('commander').Command} program
 * @param {object} deps
 */
export function registerProbe(program, deps) {
  program
    .command('probe <url>')
    .description('detect bot/CDN protection and produce a browser recipe')
    .addHelpText('after', HELP)
    .action((url, _opts, command) => {
      const { opts, driver, print } = createContext(command, deps);
      const stderr = deps.stderr ?? process.stderr;
      const log = (msg) => stderr.write(`${msg}\n`);
      const { report, recipePath } = runProbe(driver, { url, outputDir: opts.output, log });
      if (report.firstSuccess === null) {
        throw new CliError('BLOCKED', 'all probe steps were blocked', {
          hint:
            'see report.steps for per-step health; ' +
            'the site may require a persistent profile or manual login',
        });
      }
      print({ report, recipePath });
    });
}
