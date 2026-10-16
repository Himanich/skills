#!/usr/bin/env node
// Writes REPORT.html: one self-contained page, one row per skill, one column per model, coloured by
// whether the model meets the skill's floor. REPORT-detail.html (promptfoo) has the per-case view.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { costComparison, loadSkills, models, money, root, stats } from '../lib/results.mjs';

const skills = loadSkills();
const known = new Set(models.map((m) => m.label));
const totalRuns = skills.reduce((n, s) => n + s.rows.filter((r) => known.has(r.model)).length, 0);
const baseline = models.findIndex((m) => m.baseline);
const fmtFactor = (f) => (f >= 10 ? f.toFixed(0) : f.toFixed(1));
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const heat = (s, floor) => {
  if (!s.n) return 'none';
  if (s.meets) return 'ok';
  return s.good / s.n >= floor.min_pass_rate - 0.2 ? 'near' : 'bad';
};

const rows = skills.map((sk) => {
  const per = models.map((m) => stats(sk.rows.filter((r) => r.model === m.label), sk.floor));
  const lowest = models.find((_, i) => per[i].meets)?.label ?? 'none';
  const baselineBad = baseline >= 0 && per[baseline].n > 0 && !per[baseline].meets;
  const cells = per.map((s) => (s.n
    ? `<td class="${heat(s, sk.floor)}"><b>${Math.round((100 * s.good) / s.n)}%</b><small>${s.good}/${s.n} · ${s.avg.toFixed(0)} s</small><small class="cost">${money(s.cost)}/run</small><small>${s.flaky ? `<span class="flaky">${s.flaky} of ${s.cases} cases flaky</span>` : 'stable'}</small></td>`
    : '<td class="none">·</td>')).join('');
  const c = costComparison(sk);
  const saving = c.factor && c.lowest !== c.top ? `<small class="cost">${money(c.lowestCost)}/run, ${fmtFactor(c.factor)}× cheaper than ${esc(c.top)}${c.topMeets ? '' : ' (which misses the floor)'}</small>` : '';
  return `<tr><th>${esc(sk.skill)}</th>${cells}<td class="floor"><b>${esc(lowest)}</b>${saving}${baselineBad ? '<small>baseline below floor: provisional</small>' : ''}</td></tr>`;
}).join('\n');

const head = models.map((m) => `<th>${esc(m.label)}${m.baseline ? '<small>baseline</small>' : ''}</th>`).join('');
// Verdicts compare pass rates, not floors alone: a gap of 12 points or less over so few runs is no signal.
const verdictOf = (w, wo) => {
  const gap = w.good / w.n - wo.good / wo.n;
  if (Math.abs(gap) <= 0.12) return [w.meets || wo.meets ? 'no clear difference' : 'neither passes', w.meets || wo.meets ? 'Similar pass rates with and without' : 'Misses the floor both ways', w.meets || wo.meets ? 'same' : 'none'];
  return gap > 0 ? ['skill adds value', 'Clearly better with the skill', 'adds'] : ['skill not helping', 'Clearly better without the skill', 'hurts'];
};
const pairs = skills.flatMap((sk) => [...new Set(sk.noSkillRows.map((r) => r.model))]
  .sort((a, b) => models.findIndex((m) => m.label === a) - models.findIndex((m) => m.label === b))
  .map((label) => {
    const cases = new Set(sk.noSkillRows.map((r) => r.case));
    const w = stats(sk.rows.filter((r) => r.model === label && cases.has(r.case)), sk.floor);
    const wo = stats(sk.noSkillRows.filter((r) => r.model === label), sk.floor);
    return { skill: sk.skill, label, w, wo, verdict: verdictOf(w, wo), floor: sk.floor };
  }));
const pct = (x) => `${Math.round((100 * x.good) / x.n)}%`;
const delta = (a, b, fmt) => { const d = b - a; return `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d))}`; };
const noSkillRows = pairs.map((p) => `<tr><th>${esc(p.skill)}<small>${esc(p.label)}</small></th>
<td class="${heat(p.w, p.floor)}"><b>${pct(p.w)}</b><small>${p.w.good}/${p.w.n} · ${p.w.avg.toFixed(0)} s · ${money(p.w.cost)}</small></td>
<td class="${heat(p.wo, p.floor)}"><b>${pct(p.wo)}</b><small>${p.wo.good}/${p.wo.n} · ${p.wo.avg.toFixed(0)} s · ${money(p.wo.cost)}</small></td>
<td class="delta"><b>${delta(p.w.avg, p.wo.avg, (v) => `${v.toFixed(0)} s`)}</b><small>${delta(p.w.cost, p.wo.cost, money)} per run</small></td>
<td class="verdict ${p.verdict[2]}"><b>${p.verdict[0]}</b><small>${p.verdict[1]}</small></td></tr>`).join('\n');
const stillPass = pairs.filter((p) => p.wo.meets).length;
const noSkillSection = pairs.length ? `
<h2>Is the skill needed at all?</h2>
<p>The same cases without the skill: Pi loads none, the agent works in an empty folder with no skills on disk, and the prompt only adds the output format. Only two models are run this way. Without the skill, <b>${stillPass} of ${pairs.length}</b> skill and model pairs still meet the floor.</p>
<table class="cmp"><thead><tr><th>Skill and model</th><th>With the skill</th><th>Without the skill</th><th>Time and cost change without the skill</th><th>Verdict</th></tr></thead>
<tbody>
${noSkillRows}
</tbody></table>
<p class="legend" style="margin-top:10px"><span class="ok">meets the floor</span><span class="near">within 20 points</span><span class="bad">well below</span></p>` : '';
const date = new Date().toISOString().slice(0, 10);
const comparisons = skills.map(costComparison).filter((c) => c.lowestCost !== undefined && c.topCost > 0);
const sum = (key) => comparisons.reduce((n, c) => n + c[key], 0);
const headline = comparisons.length
  ? `<p class="headline">Using the lowest sufficient model for each skill costs about <b>${Math.round((100 * sum('lowestCost')) / sum('topCost'))}%</b> of always using ${esc(comparisons[0].top)} (average cost per run, summed over ${comparisons.length} skills).</p>`
  : '';

writeFileSync(join(root, 'REPORT.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Skill evals: lowest model per skill</title>
<style>
  body { font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f4f6fb; margin: 0; }
  main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 48px; }
  h1 { font-size: 24px; margin: 0 0 4px; } p { margin: 4px 0 16px; color: #55627a; }
  table { border-collapse: separate; border-spacing: 4px; width: 100%; }
  th, td { padding: 10px 12px; text-align: center; border-radius: 6px; background: #fff; }
  thead th { background: none; font-weight: 600; } th small { display: block; font-weight: 400; color: #55627a; }
  tbody th { text-align: left; background: none; font-weight: 600; }
  td b { display: block; font-size: 17px; } td small { display: block; color: #55627a; font-size: 12px; }
  .ok { background: #dff5e7; } .near { background: #fdf0d2; } .bad { background: #fbdcd8; } .none { color: #99a; }
  small.cost { color: #3b5bb5; } .flaky { color: #b4561d; font-weight: 600; } .headline { font-size: 16px; color: #172033; background: #fff; padding: 12px 16px; border-radius: 8px; }
  h2 { font-size: 20px; margin: 40px 0 4px; } table.cmp tbody th small { font-weight: 400; }
  .delta { background: #fff; } .verdict.same { background: #eef0f4; } .verdict.adds { background: #e0eafd; } .verdict.hurts { background: #fde7d3; } .verdict.none { background: #fbdcd8; }
  .floor { background: #e8eefc; } .legend span { display: inline-block; padding: 2px 10px; border-radius: 4px; margin-right: 8px; font-size: 13px; }
  footer a { color: #2157d6; }
  footer { margin-top: 20px; color: #55627a; font-size: 13px; }
</style></head><body><main>
<h1>Which model does each skill need?</h1>
<p>Share of runs that pass within the skill's time budget, with average run time, cost per run and stability. Every case runs several times (usually three) per model; a case is <span class="flaky">flaky</span> when its repeats disagree. The last column is the lowest-tier model that meets the skill's floor.</p>
${headline}
<p class="legend"><span class="ok">meets the floor</span><span class="near">within 20 points</span><span class="bad">well below</span><span class="none">not run</span></p>
<table><thead><tr><th>Skill</th>${head}<th>Lowest model meeting the floor</th></tr></thead>
<tbody>
${rows}
</tbody></table>
${noSkillSection}
<footer>${skills.length} skills, ${models.length} models, ${totalRuns} runs, generated ${date}. Floor: pass rate and time budget per skill (skills/&lt;skill&gt;/skill.yaml), usually 90% within 120 s.
Models run in tier order; the baseline must meet the floor first. Cost is the average per run at the list prices configured in Pi (per-token estimates, not an invoice). Small samples (9 to 27 runs per cell): gaps of a few points are noise.
How this was measured: <a href="methodology.html">methodology and stack</a>. Source and per-case results: <a href="https://github.com/aem-growth-adoption/skill-evals">GitHub repo</a>.</footer>
</main></body></html>
`);
console.log('REPORT.html written');
