import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const models = parse(readFileSync(join(root, 'models.yaml'), 'utf-8')).sort((a, b) => a.rank - b.rank);
export const read = (...p) => readFileSync(join(root, ...p), 'utf-8');
export const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

export const loadSkill = (skill) => {
  const { floor } = parse(read('skills', skill, 'skill.yaml'));
  const files = readdirSync(join(root, 'results', skill)).filter((f) => f.endsWith('.json'));
  const all = files.sort().map((f) => JSON.parse(read('results', skill, f)));
  const summaries = all.filter((s) => (s.arm ?? 'skill') === 'skill');
  const ordered = summaries.map((s, i) => [s, i]).sort((a, b) => (a[0].date > b[0].date) - (a[0].date < b[0].date) || a[1] - b[1]).map(([s]) => s);
  const latest = ordered.at(-1);
  const ref = latest?.ref;
  const earlierRefs = [...new Set(ordered.map((s) => s.ref))].filter((r) => r !== ref);
  const current = summaries.filter((s) => s.ref === ref);
  const noSkill = all.filter((s) => s.arm === 'no-skill');
  return {
    skill,
    floor,
    ref,
    commit: latest?.commit,
    earlierRefs,
    refs: [ref, ...earlierRefs].filter(Boolean),
    noSkillRef: noSkill.at(-1)?.ref,
    noSkillRows: noSkill.flatMap((s) => s.runs),
    rows: current.flatMap((s) => s.runs),
  };
};

export const isGood = (r, floor) => r.pass && r.latency_s <= floor.max_latency_s;
export const stats = (runs, floor) => {
  const sorted = runs.map((r) => r.latency_s).sort((a, b) => a - b);
  const good = runs.filter((r) => isGood(r, floor)).length;
  // Stability: every case is run several times per model; it is flaky when its repeats disagree.
  const outcomes = new Map();
  for (const r of runs) outcomes.set(r.case, [...(outcomes.get(r.case) ?? []), isGood(r, floor)]);
  const flaky = [...outcomes.values()].filter((o) => o.includes(true) && o.includes(false)).length;
  return {
    cases: outcomes.size,
    flaky,
    n: runs.length,
    good,
    meets: runs.length > 0 && good / runs.length >= floor.min_pass_rate,
    avg: runs.reduce((s, r) => s + r.latency_s, 0) / (runs.length || 1),
    p95: sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)] ?? 0,
    timeouts: runs.filter((r) => r.timed_out).length,
    cost: runs.reduce((s, r) => s + r.cost_usd, 0) / (runs.length || 1),
  };
};

export const cell = (s) => (s.n ? `${s.meets ? '✓' : '✗'} ${pct(s.good, s.n)} (${s.good}/${s.n})` : '·');
export const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');


/** Skills that have a suite and stored results. */
export const loadSkills = () =>
  readdirSync(join(root, 'skills')).filter((s) => readdirSync(join(root, 'results')).includes(s)).map(loadSkill);

const usd = (v) => (v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(3)}`);
export const money = usd;

/**
 * Per skill: the lowest model meeting the floor versus the highest-tier model that was run,
 * with average cost per run for each and how many times cheaper the lowest is.
 */
export function costComparison(sk) {
  const per = models.map((m) => ({ m, s: stats(sk.rows.filter((r) => r.model === m.label), sk.floor) })).filter((x) => x.s.n);
  const lowest = per.find((x) => x.s.meets);
  const top = per.at(-1);
  if (!lowest || !top) return { lowest: lowest?.m.label ?? null, top: top?.m.label ?? null };
  return {
    lowest: lowest.m.label,
    lowestCost: lowest.s.cost,
    top: top.m.label,
    topMeets: top.s.meets,
    topCost: top.s.cost,
    factor: lowest.s.cost > 0 ? top.s.cost / lowest.s.cost : null,
  };
}
