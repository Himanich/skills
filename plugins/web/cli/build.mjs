import {
  readdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { build } from 'esbuild';

const BUNDLES_DIR = new URL('./src/bundles/', import.meta.url);
const DIST = new URL('./dist/', import.meta.url);
const ENTRIES = [
  ['bin/web.mjs', 'web.mjs'],
  ['src/lib.mjs', 'lib.mjs'],
];

function inlineBundles() {
  const files = readdirSync(BUNDLES_DIR)
    .filter((f) => f !== 'index.mjs')
    .sort();
  const table = Object.fromEntries(
    files.map((f) => [f, readFileSync(new URL(f, BUNDLES_DIR), 'utf-8')]),
  );
  return `const T = ${JSON.stringify(table)};
export function loadBundle(name) {
  if (!(name in T)) throw new Error(\`unknown bundle: \${name}\`);
  return T[name];
}
`;
}

const inlinePlugin = {
  name: 'inline-bundles',
  setup(b) {
    b.onResolve({ filter: /^#src\/bundles\/index\.mjs$/ }, () => ({
      path: 'inline-bundles',
      namespace: 'inline',
    }));
    b.onLoad({ filter: /.*/, namespace: 'inline' }, () => ({
      contents: inlineBundles(),
      loader: 'js',
    }));
  },
};

async function bundle(entry, name) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: `dist/${name}`,
    external: ['cld3-asm'],
    legalComments: 'none',
    write: false,
    plugins: [inlinePlugin],
    absWorkingDir: new URL('./', import.meta.url).pathname,
  });
  return result.outputFiles[0].text;
}

const check = process.argv.includes('--check');
mkdirSync(DIST, { recursive: true });
for (const [entry, name] of ENTRIES) {
  const out = new URL(name, DIST);
  const text = await bundle(entry, name);
  if (!check) {
    writeFileSync(out, text);
    if (name === 'web.mjs') chmodSync(out, 0o755);
  } else if (!existsSync(out) || readFileSync(out, 'utf-8') !== text) {
    console.error(`dist/${name} is stale — run: npm run build`);
    process.exit(1);
  }
}
