# web CLI

`web` drives a browser and analyzes pages for the web plugin's skills: session
plumbing, bot-protection probing, page analysis (tree, reduce, collect, langs,
overlays), Chrome extension piloting and domain masking. It is the only consumer
of `playwright-cli` in the plugin (`src/driver/playwright-cli.mjs`).

## Requirements

- Node 22.12+
- `playwright-cli` >= 0.1.20 on PATH: `npm install -g @playwright/cli@latest`
  (`playwright-cli --version`)
- `page langs` needs `cld3-asm` (optional dependency; `npm install` in this directory)
- `mask` needs `mkcert` and sudo (macOS)

## Install / run

Locate `web` once:

```bash
# <skill-dir> is a skill directory under <plugin-dir>/skills/
WEB=$(command -v web || echo "node <skill-dir>/../../cli/dist/web.mjs")
```

then run `$WEB …`; it prints exactly one JSON document on stdout,
so `$WEB … > file.json` is safe.
Fallback when published: `npx -y @adobe/web-cli …`.

`web --help`, `web <group> --help` and `web <group> <command> --help` list every
option, output shape and exit code.

## Extending with your own commands

The package also exports a library (`dist/lib.mjs`, the package's `exports`) so another
program can ship `web` plus its own subcommands and keep the output, session and
exit-code contract:

```js
#!/usr/bin/env node
import { runCli, runPageCommand, CliError } from '@adobe/web-cli';

const extend = (program, deps) =>
  program.command('acme').command('audit [url]').option('--strict')
    .action((url, _opts, command) =>
      runPageCommand(command, deps, {
        url,
        fn: (driver, session, opts) => {
          const n = driver.run(session, { code: 'document.querySelectorAll("h1").length' });
          if (opts.strict && n !== 1) throw new CliError('EMPTY_RESULT', `${n} h1 elements`);
          return { h1: n };
        },
      }));

process.exitCode = await runCli(process.argv, { extend });
```

`acme audit <url>` then behaves like a stock `page` command: one-shot or `--session`,
blocked-page gate, `{ ...result, url, session, durationMs }` on stdout, JSON errors and the
exit codes above. The surface is `createProgram`, `runCli`, `runPageCommand`,
`createContext`, `withSession`, `artifactDir`, `artifactPath`, `emit`, `fail`, `CliError`,
`EXIT` and `createDriver` (see `src/lib.mjs`); the skills keep working against the
extended binary through `WEB=acme-web`.

## Development

```bash
npm test              # unit tests (node --test, fake driver)
npm run test:smoke    # real browser; skipped without playwright-cli
npm run build         # rebuild dist/web.mjs and dist/lib.mjs
npm run check:dist    # fails when either dist file is stale
```

Commit `dist/` with any change under `src/`.
