import { fail, graded, ok, sessionEval } from '../../lib/outputs.mjs';

const gone = (selector) =>
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return !el || getComputedStyle(el).display === 'none' || el.getBoundingClientRect().height === 0; })()`;

// Same residual check the skill's Step 7a runs: large, high z-index, fixed, inside the viewport.
const RESIDUAL = `[...document.querySelectorAll('*')].filter((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.position === 'fixed' && parseInt(s.zIndex) > 1000 && r.width > 300 && r.height > 50 && r.bottom > 0 && r.top < innerHeight && s.display !== 'none' && s.visibility !== 'hidden'; }).map((el) => el.id || el.className || el.tagName)`;

const evalJson = (response, expression) => sessionEval(response, `JSON.stringify(${expression})`);
const problems = (checks) => Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);

const CHECKS = {
  banner: (r, v) => ({
    'banner gone': JSON.parse(evalJson(r, gone(v.overlay))),
    'page content intact': JSON.parse(evalJson(r, `document.querySelector('h1')?.textContent === ${JSON.stringify(v.heading)}`)),
    'did not accept tracking': JSON.parse(evalJson(r, `window.__consent !== 'accepted'`)),
  }),
  modal: (r, v) => ({
    'modal gone': JSON.parse(evalJson(r, gone(v.overlay))),
    'scroll unlocked': JSON.parse(evalJson(r, `getComputedStyle(document.body).overflow !== 'hidden'`)),
    'page content intact': JSON.parse(evalJson(r, `document.querySelector('h1')?.textContent === ${JSON.stringify(v.heading)}`)),
    'did not subscribe': JSON.parse(evalJson(r, `window.__subscribed !== true`)),
  }),
  residual: (r) => ({
    'no blocking fixed overlay left': JSON.parse(evalJson(r, `(${RESIDUAL}).length === 0`)),
    'page still loaded': JSON.parse(evalJson(r, `location.hostname.includes('20minutes') && document.body.innerText.length > 200`)),
  }),
};

export const overlaysCleared = graded((_output, { vars, providerResponse }) => {
  const failed = problems(CHECKS[vars.check](providerResponse, vars));
  return failed.length ? fail(`failed checks: ${failed.join(', ')}`) : ok(`${vars.check} checks passed`);
});
