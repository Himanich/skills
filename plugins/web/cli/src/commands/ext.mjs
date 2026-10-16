import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { CliError } from '#src/errors.mjs';
import { createContext } from '#src/context.mjs';
import { artifactPath, generateSessionName, requireOpenSession } from '#src/session.mjs';

const DESCRIPTION = 'pilot a Chrome extension: launch, open, status, close';
const SIDEPANEL_NOTE =
  'chrome.sidePanel.open() needs a user gesture; opened the panel page as a tab instead';
const LOAD_FAILED_HINT = 'check manifest.json and the extension build; see chrome://extensions';

/** @param {string} dir absolute extension directory */
export function readManifest(dir) {
  const hint = 'pass the built extension directory that contains manifest.json';
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new CliError('USAGE', `extension directory not found: ${dir}`, { hint });
  }
  try {
    return JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  } catch (err) {
    throw new CliError('USAGE', `cannot read manifest.json in ${dir}: ${err.message}`, { hint });
  }
}

/** @returns {string[]} surfaces the manifest declares */
export function availableSurfaces(manifest) {
  const surfaces = [];
  if (manifest.side_panel?.default_path) surfaces.push('sidepanel');
  if (manifest.action?.default_popup) surfaces.push('popup');
  if (manifest.options_page || manifest.options_ui?.page) surfaces.push('options');
  return surfaces;
}

function surfacePath(manifest, surface) {
  const paths = {
    sidepanel: manifest.side_panel?.default_path,
    popup: manifest.action?.default_popup,
    options: manifest.options_page ?? manifest.options_ui?.page,
  };
  return paths[surface];
}

const FIND_ID_CODE = `async page => {
  const ctx = page.context();
  const worker = ctx.serviceWorkers()[0]
    ?? await ctx.waitForEvent('serviceworker', { timeout: 5000 }).catch(() => null);
  return worker ? worker.url() : null;
}`;

function extensionIdFrom(url) {
  return typeof url === 'string' ? (url.match(/^chrome-extension:\/\/([^/]+)\//)?.[1] ?? null) : null;
}

function openTabCode(path, extensionId) {
  const url = `chrome-extension://${extensionId}/${path.replace(/^\//, '')}`;
  return `async page => {
    const p = await page.context().newPage();
    await p.goto(${JSON.stringify(url)});
    return p.url();
  }`;
}

function sessionFile(ctx) {
  return artifactPath(ctx.opts.output, ctx.opts.session, 'ext', 'session.json');
}

function loadSessionFile(ctx) {
  const file = sessionFile(ctx);
  if (!existsSync(file)) {
    const name = ctx.opts.session;
    throw new CliError('NO_SESSION', `no ext session ${name}`, {
      hint: `run: web ext launch <dist-dir> --session ${name}`,
    });
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

function launch(ctx, distDir) {
  const { opts, driver, print } = ctx;
  const abs = resolve(distDir);
  const surfaces = availableSurfaces(readManifest(abs));
  const session = opts.session ?? generateSessionName();
  const { cdpPort } = opts;
  driver.open({
    session,
    url: 'about:blank',
    headed: true,
    persistent: true,
    cdpPort,
    config: {
      browserName: 'chromium',
      launchOptions: {
        args: [`--load-extension=${abs}`, `--disable-extensions-except=${abs}`],
      },
    },
  });
  const extensionId = extensionIdFrom(driver.run(session, { code: FIND_ID_CODE }));
  if (!extensionId) {
    driver.close(session);
    throw new CliError('FAILURE', 'extension did not load', { hint: LOAD_FAILED_HINT });
  }
  const info = { session, extensionId, extensionPath: abs, surfaces, cdpPort };
  const file = artifactPath(opts.output, session, 'ext', 'session.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(info));
  print(info);
}

function open(ctx, surface) {
  const { driver, opts, print } = ctx;
  requireOpenSession(driver, opts.session);
  const info = loadSessionFile(ctx);
  if (!info.surfaces.includes(surface)) {
    const avail = info.surfaces.join(', ') || 'none';
    throw new CliError('USAGE', `extension does not declare ${surface}`, {
      hint: `available surfaces: ${avail}`,
    });
  }
  const path = surfacePath(readManifest(info.extensionPath), surface);
  const url = driver.run(opts.session, { code: openTabCode(path, info.extensionId) });
  print({ surface, url, ...(surface === 'sidepanel' && { note: SIDEPANEL_NOTE }) });
}

function status({ driver, opts, print }) {
  const file = artifactPath(opts.output, opts.session, 'ext', 'session.json');
  const info = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  const isOpen = driver.list().some((s) => s.name === opts.session && s.status === 'open');
  print({
    session: opts.session,
    open: isOpen,
    extensionId: info?.extensionId ?? null,
    surfaces: info?.surfaces ?? null,
  });
}

function close(ctx) {
  const { driver, opts, print } = ctx;
  driver.close(opts.session);
  const file = sessionFile(ctx);
  if (existsSync(file)) unlinkSync(file);
  print({ session: opts.session, status: 'closed' });
}

function needSession(ctx) {
  if (!ctx.opts.session) {
    throw new CliError('NO_SESSION', 'no session given', {
      hint: 'pass --session <name> or set WEB_SESSION',
    });
  }
}

/**
 * Register the `ext` group.
 * @param {import('commander').Command} program
 * @param {object} deps
 */
export function registerExt(program, deps) {
  const ext = program.command('ext').description(DESCRIPTION);
  const action = (cmd, fn, { needs = true } = {}) =>
    cmd.action(async (...args) => {
      const ctx = createContext(args.at(-1), deps);
      if (needs) needSession(ctx);
      await fn(ctx, ...args.slice(0, -2));
    });
  action(
    ext
      .command('launch <dist-dir>')
      .description('launch a headed browser with the extension loaded')
      .option('--cdp-port <n>', 'remote debugging port', Number),
    launch,
    { needs: false },
  );
  action(ext.command('open <surface>').description('open sidepanel, popup or options'), open);
  action(ext.command('status').description('show extension session state'), status);
  action(ext.command('close').description('close the extension session'), close);
}
