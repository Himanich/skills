import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CliError } from '#src/errors.mjs';
import { loadBundle } from '#src/bundles/index.mjs';

/** Where `--save-recipe` writes, and what is loaded when it exists and `--recipe` is not given. */
export const DEFAULT_RECIPE = 'recipe.json';

const TYPES = ['probe', 'overlays'];
const HINT = 'produce one with: web probe <url> --save-recipe, or web page overlays --save-recipe';

/**
 * Read a recipe file: one object, one array of entries per recipe type
 * (`probe`, `overlays`).
 * @param {string} path
 * @returns {Record<string, object[]>}
 */
export function readRecipe(path) {
  let recipe;
  try {
    recipe = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new CliError('USAGE', `cannot read recipe ${path}: ${err.message}`, { hint: HINT });
  }
  if (recipe === null || typeof recipe !== 'object' || Array.isArray(recipe)) {
    throw new CliError('USAGE', `recipe ${path} must be a JSON object`, { hint: HINT });
  }
  const unknown = Object.keys(recipe).filter((key) => !TYPES.includes(key));
  if (unknown.length > 0) {
    throw new CliError('USAGE', `recipe ${path} has unknown keys: ${unknown.join(', ')}`, {
      hint: `a recipe holds one array per type (${TYPES.join(', ')}); ${HINT}`,
    });
  }
  return recipe;
}

/**
 * Replace the entries of one recipe type in a recipe file, keeping the other types. A file that
 * exists but is not a recipe is an error, never overwritten.
 * @returns {string} absolute path written
 */
export function saveRecipe(path, type, entries) {
  const file = resolve(path);
  const recipe = existsSync(file) ? readRecipe(file) : {};
  writeFileSync(file, `${JSON.stringify({ ...recipe, [type]: entries }, null, 2)}\n`);
  return file;
}

// An init script runs before the document has a root element, hence the observer.
function hideScript(rules) {
  return `(() => {
  const css = ${JSON.stringify(rules.join('\n'))};
  const add = () => {
    const root = document.head || document.documentElement;
    if (!root) return false;
    const style = document.createElement('style');
    style.textContent = css;
    root.appendChild(style);
    return true;
  };
  if (add()) return;
  const observer = new MutationObserver(() => add() && observer.disconnect());
  observer.observe(document, { childList: true });
})();
`;
}

/**
 * Turn a recipe into browser launch options.
 * @param {string} path
 * @returns {{ config: object | undefined, persistent: boolean, initSources: string[] }}
 */
export function loadRecipe(path) {
  const { probe = [], overlays = [] } = readRecipe(path);
  const initSources = [];
  if (probe[0]?.stealth) initSources.push(loadBundle('stealth-init.js'));
  const rules = overlays.flatMap((entry) => entry.rules ?? []);
  if (rules.length > 0) initSources.push(hideScript(rules));
  return { config: probe[0]?.config, persistent: probe[0]?.persistent === true, initSources };
}

/**
 * Launch options for `driver.open`: the recipe's, overridden by every explicit value that is
 * not undefined.
 * @param {string | undefined} recipePath
 * @param {object} explicit
 */
export function resolveLaunch(recipePath, explicit = {}) {
  const set = Object.fromEntries(Object.entries(explicit).filter(([, v]) => v !== undefined));
  return { ...(recipePath ? loadRecipe(recipePath) : {}), ...set };
}
