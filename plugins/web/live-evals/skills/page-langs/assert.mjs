import { fail, graded, ok, readJson } from '../../lib/outputs.mjs';

const sameSet = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/** langs.json exists and agrees with the expected facts for this page. */
export const langsMatchExpected = graded((_output, { vars, providerResponse }) => {
  const langs = readJson(providerResponse, 'langs.json');
  if (!langs) return fail('langs.json missing or invalid');
  const { expect } = vars;
  const got = {
    top: langs.detected?.[0]?.language,
    detected: (langs.detected ?? []).map((d) => d.language),
    html_lang: langs.declared?.htmlLang,
    undeclared: langs.reconciliation?.detectedNotDeclared,
    declared_not_detected: langs.reconciliation?.declaredNotDetected,
    agreement: langs.reconciliation?.agreement,
  };
  const wrong = Object.entries(expect).filter(([key, want]) =>
    Array.isArray(want) ? !sameSet(got[key], want) : got[key] !== want);
  return wrong.length
    ? fail(wrong.map(([k, want]) => `${k}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got[k])}`).join('; '))
    : ok(`matches ${Object.keys(expect).join(', ')}`);
});
