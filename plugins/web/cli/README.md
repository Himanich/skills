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

Resolve `WEB` once, first match wins:

```bash
web …                                        # 1. on PATH
node "<plugin-dir>/cli/dist/web.mjs" …       # 2. plugin layout: <skill-dir>/../../cli/dist/web.mjs
npx -y @adobe/web-cli …                      # 3. when published
```

`dist/web.mjs` is a committed single-file bundle.

## Sessions

- A `<url>` with no `--session` opens a browser for that one command and closes it.
- `--session <name>` reuses an open browser; with a `<url>` it opens one under that name if
  needed; either way the browser stays open. `WEB_SESSION`, then
  `PLAYWRIGHT_CLI_SESSION`, is the default for `--session`. Names without a value are generated as `web-<4 hex>`.
- Sessions are scoped to the working directory. `playwright-cli -s <session> …`
  drives the same browser.

## Output contract

stdout is one JSON document (or one text block with `--format text`); stderr carries
progress and logs. `WEB_DEBUG=1` echoes every playwright-cli call to stderr.
Errors: `{ "error": { "code", "message", "hint" } }`. Main codes: `USAGE`,
`NO_SESSION`, `SESSION_EXISTS`, `PLAYWRIGHT_CLI`, `BLOCKED`, `TIMEOUT`,
`UNSUPPORTED`, `EMPTY_RESULT`.

Exit codes: `0` ok · `1` failure · `2` usage or environment · `3` blocked by bot protection.

Artifacts are written under `--output` (default `./.web`) as `<session>-<command>-<name>`.

Global options: `--session`, `--format json|text`, `--output`, `--headed`, `--recipe`.

## Examples

```bash
# browser: session plumbing
web browser open https://example.com --session s1
web browser eval "document.title" --session s1
web browser close --session s1

# probe: find a configuration that gets past bot protection
web probe https://example.com
web page tree https://example.com --recipe .web/probe-probe-recipe.json

# page: analyze
web page tree https://example.com --min-width 600
web page reduce https://example.com --retries 3
web page collect metadata https://example.com
web page langs https://example.com
web page overlays --session s1 --dismiss --mode thorough

# ext: pilot an unpacked extension
web ext launch ./dist --session ext1
web ext open sidepanel --session ext1

# mask: serve a URL under a fake local HTTPS domain
sudo env CAROOT="$(mkcert -CAROOT)" web mask wknd.adventures https://example.com
```

`web --help`, `web <group> --help` and `web <group> <command> --help` list every
option, output shape and exit code.

## Development

```bash
npm test              # unit tests (node --test, fake driver)
npm run test:smoke    # real browser; skipped without playwright-cli
npm run build         # rebuild dist/web.mjs
npm run check:dist    # fails when dist/web.mjs is stale
```

Commit `dist/web.mjs` with any change under `src/`. Design:
`docs/superpowers/specs/2026-10-16-web-cli-design.md` (repository root).
