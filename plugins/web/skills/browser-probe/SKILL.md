---
name: browser-probe
license: Apache-2.0
compatibility: Requires Node 22+ and playwright-cli on PATH; uses the web CLI (plugins/web/cli)
description: >-
  Detects CDN bot protection (Akamai, Cloudflare, DataDome, AWS WAF) by probing a
  URL with escalating headless browser configurations through `web probe`, and
  writes a browser recipe that other web commands load with `--recipe`. Use when a
  page is blocked, empty, or shows a 403, "access denied", or captcha page in
  headless Chrome, or before automating a site known to block bots.
---

# Browser Probe

Detect CDN bot protection blocking headless Chrome and produce a browser recipe
for the other `web` commands.

## Requirements

Node 22+ and `playwright-cli` >= 0.1.20 on PATH (`playwright-cli --version`).
Resolve the `web` CLI once and call it `WEB`, first match wins:

1. `web` on PATH
2. `node "<skill-dir>/../../cli/dist/web.mjs"`, where `<skill-dir>` is the
   directory containing this SKILL.md (plugin layout)
3. `npx -y @adobe/web-cli` (when published)

Resolve paths from the current working directory with `<skill-dir>` made
absolute; don't `cd` into the skill directory. Every example below is written
as `$WEB …`.


## When to Use

When a `web` command exits 3 (blocked), a page comes back blocked or empty (403,
"access denied", "captcha"), or before automating a site known to block bots.

## Command

```bash
$WEB probe "$URL" [--output <dir>]
```

It tries up to 5 browser configurations and stops at the first success:

1. **default**: headless Chromium (baseline)
2. **stealth**: headless Chromium + JS stealth init script (patches `navigator.webdriver`, plugins, languages)
3. **stealth-ua**: stealth + User-Agent override (removes `HeadlessChrome` from the HTTP UA header)
4. **chrome**: system Chrome + stealth + UA override (fixes TLS fingerprint detection)
5. **persistent**: system Chrome + stealth + UA override + persistent profile (cookie/session challenges)

Progress goes to stderr. Files under `--output` (default `./.web`):
`probe-<id>/probe-report.json` and, on success, `probe-<id>/browser-recipe.json` (plus
`stealth-init.js` when the working step uses stealth). The path is printed as `recipePath`.

## Reading the JSON

`{ report: { url, timestamp, steps, firstSuccess, detectedSignals }, recipePath }`

- `firstSuccess` non-null: that configuration worked and is the minimum sufficient
  one; `recipePath` points at the recipe.
- A step with `headerError` could not read response headers, so `detectedSignals`
  may be incomplete; mention it in the report.
- Match `detectedSignals` against the Provider Signature Table in
  [references/stealth-config.md](references/stealth-config.md) to confirm why
  blocking occurred.

Exit 3 (`BLOCKED`): every step was blocked and **no recipe is written**. Do not
continue with a broken configuration. Report:

```
Browser probe failed for <url>. No headless configuration could load the page.
  Tried: default, stealth, stealth-ua, chrome, persistent
  Detected signals: <detectedSignals>

  Options:
  1. Use --headed for manual browser interaction
  2. Provide pre-captured data (DOM snapshot, screenshots) manually
  3. Check if the URL requires authentication or VPN access
```

On success report:

```
Browser probe complete for <url>.
  Working config: <firstSuccess>
  Detected: <detectedSignals or "no bot protection detected">
  Recipe: <recipePath>
```

## Chaining: use the recipe

Pass the recipe to any command, or to `browser open`:

```bash
RECIPE=$($WEB probe "$URL" | jq -r .recipePath)
$WEB page tree "$URL" --recipe "$RECIPE"
$WEB browser open "$URL" --session s1 --recipe "$RECIPE"
```

The recipe is `{ cliConfig: { browser: { browserName, launchOptions, initScript? } }, persistent }`:
the playwright-cli config with the stealth script path already filled in, and
`persistent: true` when `firstSuccess` is `persistent`.

## Escape hatch

`playwright-cli -s <session> …` drives the same browser.
