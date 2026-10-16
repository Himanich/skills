import { existsSync } from 'node:fs';
import { CliError } from '#src/errors.mjs';
import { createContext } from '#src/context.mjs';
import {
  artifactPath,
  generateSessionName,
  loadRecipe,
  requireOpenSession,
} from '#src/session.mjs';

const DESCRIPTION = 'session plumbing: open, attach, list, close, eval, run, cdp, screenshot';

function sessionUrl(driver, { name, status }) {
  if (status !== 'open') return null;
  try {
    return driver.evaluate(name, 'location.href');
  } catch {
    return null;
  }
}

function parseParams(json) {
  if (json === undefined) return {};
  try {
    return JSON.parse(json);
  } catch (err) {
    throw new CliError('USAGE', `params-json is not valid JSON: ${err.message}`);
  }
}

/**
 * Register the `browser` group.
 * @param {import('commander').Command} program
 * @param {object} deps
 */
export function registerBrowser(program, deps) {
  const browser = program.command('browser').description(DESCRIPTION);
  const action = (cmd, fn) =>
    cmd.action(async (...args) => {
      const command = args.at(-1);
      const ctx = createContext(command, deps);
      await fn(ctx, ...args.slice(0, -2));
    });
  const openSession = (ctx) => {
    requireOpenSession(ctx.driver, ctx.opts.session);
    return ctx.opts.session;
  };

  action(
    browser
      .command('open [url]')
      .description('open a browser session')
      .option('--cdp-port <n>', 'remote debugging port', Number)
      .option('--persistent', 'use a persistent profile'),
    ({ opts, driver, print }, url) => {
      const session = opts.session ?? generateSessionName();
      const recipe = opts.recipe ? loadRecipe(opts.recipe) : {};
      const cdpPort = opts.cdpPort;
      driver.open({
        session,
        url,
        headed: opts.headed,
        cdpPort,
        persistent: opts.persistent || recipe.persistent,
        config: recipe.config,
      });
      print({ session, url, headed: Boolean(opts.headed), ...(cdpPort && { cdpPort }) });
    },
  );

  action(
    browser.command('attach <cdp-url>').description('attach to a running Chrome'),
    ({ opts, driver, print }, cdpUrl) => {
      const session = opts.session ?? generateSessionName();
      driver.attach({ session, cdpUrl });
      print({ session, attached: true });
    },
  );

  action(browser.command('list').description('list sessions'), ({ driver, print }) => {
    const sessions = driver.list().map((s) => ({
      name: s.name,
      status: s.status,
      headed: s.headed,
      url: sessionUrl(driver, s),
    }));
    print({ sessions });
  });

  action(browser.command('close').description('close the session'), (ctx) => {
    const session = openSession(ctx);
    ctx.driver.close(session);
    ctx.print({ session, status: 'closed' });
  });

  action(browser.command('close-all').description('close every session'), (ctx) => {
    const closed = ctx.driver.list().map((s) => s.name);
    ctx.driver.closeAll();
    ctx.print({ closed });
  });

  action(
    browser.command('eval <expr>').description('evaluate a JS expression'),
    (ctx, expr) => {
      ctx.print({ result: ctx.driver.evaluate(openSession(ctx), expr) });
    },
  );

  action(
    browser.command('run <file-or-code>').description('run a Playwright script or code'),
    (ctx, arg) => {
      const target = existsSync(arg) ? { file: arg } : { code: arg };
      ctx.print({ result: ctx.driver.run(openSession(ctx), target) });
    },
  );

  action(
    browser.command('cdp <method> [params-json]').description('send a raw CDP command'),
    (ctx, method, json) => {
      const params = parseParams(json);
      ctx.print({ result: ctx.driver.cdp(openSession(ctx), method, params) });
    },
  );

  action(
    browser
      .command('screenshot')
      .description('take a screenshot')
      .option('--full-page', 'capture the full page')
      .option('--selector <css>', 'capture one element'),
    (ctx) => {
      const session = openSession(ctx);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = artifactPath(ctx.opts.output, session, 'screenshot', `${stamp}.png`);
      ctx.driver.screenshot(session, {
        path,
        fullPage: ctx.opts.fullPage,
        selector: ctx.opts.selector,
      });
      ctx.print({ path });
    },
  );
  return browser;
}
