import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, graded, ok, outDir, readJson, readText } from '../../lib/outputs.mjs';

const problems = (checks) => Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const sectionMarkers = (skeleton) => (skeleton.match(/<!-- section:\d+ /g) ?? []).length;

const CHECKS = {
  'reduce-full': (r) => {
    const skeleton = readText(r, 'skeleton.html') ?? '';
    const manifest = readJson(r, 'manifest.json');
    return {
      'five section markers': sectionMarkers(skeleton) === 5,
      'manifest lists five sections': manifest?.sections?.length === 5,
      'cards collapsed to two examples plus REPEAT:2': (skeleton.match(/class="card"/g) ?? []).length === 2 && /\{REPEAT:2\}/.test(skeleton),
      'heading and CTA tokens kept': /\{HEADING:1\}/.test(skeleton) && /\{CTA:Get started\}/.test(skeleton),
      'no scripts or tracking': !/<script|__tracking/.test(skeleton),
      'real text removed': !/Acme helps small teams/.test(skeleton),
    };
  },
  'reduce-phase1': (r) => {
    const phase1 = readJson(r, 'phase1-output.json');
    return {
      'five sections': phase1?.sections?.length === 5,
      'tokenized html present': phase1?.sections?.every((s) => typeof s.tokenizedHtml === 'string'),
      'url recorded': phase1?.url === 'http://localhost:8765/reduce.html',
      'stopped before phase 2': !existsSync(join(outDir(r), 'skeleton.html')),
    };
  },
  'reduce-valid': (r) => {
    const skeleton = readText(r, 'skeleton.html') ?? '';
    const manifest = readJson(r, 'manifest.json');
    return {
      'several sections': sectionMarkers(skeleton) >= 3,
      'manifest matches markers': manifest?.sections?.length === sectionMarkers(skeleton),
      'no scripts': !/<script/.test(skeleton),
    };
  },
};

export const reduceMatches = graded((_output, { vars, providerResponse }) => {
  const failed = problems(CHECKS[vars.check](providerResponse));
  return failed.length ? fail(`failed checks: ${failed.join(', ')}`) : ok(`${vars.check} checks passed`);
});
