# Skill eval report

8 skills, 6 models, 147 runs. Models are ordered from lowest to highest tier.
Each cell is the share of runs that passed within the skill's time budget; ✓ means it meets the skill's floor
(see each section), ✗ that it does not, · that the model was not run. Every case is run several times per
model (usually 3) to measure stability: a case is flaky when its repeats disagree, which the per-skill tables count. Numbers rest on small samples (9 to 27 runs
per cell): treat gaps of a few points as noise. Live sites drift, so rerun before relying on one result.

## The gist

- **browser-probe**: sonnet-5.5-low
- **cdp-connect**: sonnet-5.5-low
- **cdp-ext-pilot**: sonnet-5.5-low
- **page-collect**: sonnet-5.5-low
- **page-langs**: sonnet-5.5-low
- **page-prep**: sonnet-5.5-low
- **page-reduce**: sonnet-5.5-low
- **page-tree**: sonnet-5.5-low

## Cost of the model choice

| Skill | Lowest sufficient model | $/run | Highest model run | $/run | Savings |
|---|---|---|---|---|---|
| browser-probe | sonnet-5.5-low | $0.020 | sonnet-5.5-low | $0.020 | same model |
| cdp-connect | sonnet-5.5-low | $0.016 | sonnet-5.5-low | $0.016 | same model |
| cdp-ext-pilot | sonnet-5.5-low | $0.029 | sonnet-5.5-low | $0.029 | same model |
| page-collect | sonnet-5.5-low | $0.022 | sonnet-5.5-low | $0.022 | same model |
| page-langs | sonnet-5.5-low | $0.019 | sonnet-5.5-low | $0.019 | same model |
| page-prep | sonnet-5.5-low | $0.029 | sonnet-5.5-low | $0.029 | same model |
| page-reduce | sonnet-5.5-low | $0.041 | sonnet-5.5-low | $0.041 | same model |
| page-tree | sonnet-5.5-low | $0.018 | sonnet-5.5-low | $0.018 | same model |

## Skill x model matrix

| Skill | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low (baseline) | opus-5.5-low | Lowest model meeting the floor |
|---|---|---|---|---|---|---|---|
| [browser-probe](#browser-probe) | · | · | · | · | ✓ 100% (15/15) | · | **sonnet-5.5-low** |
| [cdp-connect](#cdp-connect) | · | · | · | · | ✓ 100% (21/21) | · | **sonnet-5.5-low** |
| [cdp-ext-pilot](#cdp-ext-pilot) | · | · | · | · | ✓ 100% (9/9) | · | **sonnet-5.5-low** |
| [page-collect](#page-collect) | · | · | · | · | ✓ 100% (27/27) | · | **sonnet-5.5-low** |
| [page-langs](#page-langs) | · | · | · | · | ✓ 100% (30/30) | · | **sonnet-5.5-low** |
| [page-prep](#page-prep) | · | · | · | · | ✓ 100% (15/15) | · | **sonnet-5.5-low** |
| [page-reduce](#page-reduce) | · | · | · | · | ✓ 100% (15/15) | · | **sonnet-5.5-low** |
| [page-tree](#page-tree) | · | · | · | · | ✓ 100% (15/15) | · | **sonnet-5.5-low** |

## Without the skill

Same cases and the same graders, but Pi has no skill loaded and the workspace contains none; runs are checked for reads of skill files. The prompt gets one addition: the output format (file names and fields, never how to produce them), because the graders read the skill's own formats. Cases that depend on a skill's own method are left out, and browser-probe is judged on "the recipe really loads the page" only. With-skill figures are restricted to the same cases. Only a few models are run this way: it is a comparison, not a benchmark.

No-skill rows come from the ref(s) named per skill: browser-probe → fix-web-skills-best-practices, cdp-connect → fix-web-skills-best-practices, page-collect → fix-web-skills-best-practices, page-langs → fix-web-skills-best-practices, page-prep → fix-web-skills-best-practices, page-reduce → fix-web-skills-best-practices, page-tree → fix-web-skills-best-practices.

| Skill | Model | With skill | Without skill | Time with / without | Cost with / without |
|---|---|---|---|---|---|
| browser-probe | sonnet-5.5-low | ✓ 100% (12/12) | ✓ 100% (12/12) | 30 s / 24 s | $0.021 / $0.025 |
| browser-probe | haiku-5.5-low | · | ✗ 58% (7/12) | 0 s / 63 s | $0.0000 / $0.0032 |
| cdp-connect | haiku-5.5-low | · | ✗ 89% (16/18) | 0 s / 12 s | $0.0000 / $0.0013 |
| cdp-connect | sonnet-5.5-low | ✓ 100% (18/18) | ✓ 94% (17/18) | 15 s / 10 s | $0.017 / $0.014 |
| page-collect | sonnet-5.5-low | ✓ 100% (18/18) | ✓ 100% (18/18) | 17 s / 18 s | $0.022 / $0.039 |
| page-collect | haiku-5.5-low | · | ✓ 100% (18/18) | 0 s / 29 s | $0.0000 / $0.0047 |
| page-langs | sonnet-5.5-low | ✓ 100% (18/18) | ✗ 83% (15/18) | 11 s / 10 s | $0.018 / $0.016 |
| page-langs | haiku-5.5-low | · | ✓ 100% (18/18) | 0 s / 13 s | $0.0000 / $0.0017 |
| page-prep | sonnet-5.5-low | ✓ 100% (9/9) | ✓ 100% (9/9) | 24 s / 12 s | $0.027 / $0.013 |
| page-prep | haiku-5.5-low | · | ✓ 100% (9/9) | 0 s / 25 s | $0.0000 / $0.0017 |
| page-reduce | sonnet-5.5-low | ✓ 100% (6/6) | ✗ 50% (3/6) | 31 s / 19 s | $0.076 / $0.045 |
| page-reduce | haiku-5.5-low | · | ✗ 83% (5/6) | 0 s / 29 s | $0.0000 / $0.0044 |
| page-tree | haiku-5.5-low | · | ✗ 44% (4/9) | 0 s / 38 s | $0.0000 / $0.0035 |
| page-tree | sonnet-5.5-low | ✓ 100% (9/9) | ✗ 78% (7/9) | 16 s / 21 s | $0.018 / $0.037 |

## browser-probe

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices, fix-web-skills-best-practices@b3aa00ec.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 29 | 52 | 0 | 0.020 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| wknd | 100% (3/3) |
| astrazeneca | 100% (3/3) |
| adobe | 100% (3/3) |
| bd | 100% (3/3) |
| stripe | 100% (3/3) |

## cdp-connect

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 21 | 100% | ✓ 100% (21/21) | 0 of 7 | 14 | 43 | 0 | 0.016 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| fill and submit the greeter form | 100% (3/3) |
| screenshot | 100% (3/3) |
| network request on load | 100% (3/3) |
| accessible buttons | 100% (3/3) |
| several tabs, click in the right one | 100% (3/3) |
| console output after a reload | 100% (3/3) |
| live, open basecamp.com and read the title | 100% (3/3) |

## cdp-ext-pilot

Floor: ≥ 90% of runs pass within 150 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 23 | 37 | 0 | 0.029 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| sidepanel, save a note | 100% (3/3) |
| options page screenshot | 100% (3/3) |
| extension id | 100% (3/3) |

## page-collect

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 27 | 100% | ✓ 100% (27/27) | 0 of 9 | 17 | 41 | 0 | 0.022 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| fixture, full inventory | 100% (3/3) |
| fixture, icons for Edge Delivery Services | 100% (3/3) |
| fixture, forms only | 100% (3/3) |
| aem.live, full inventory | 100% (3/3) |
| fixture, icons from sprites, data URIs and inline SVG | 100% (3/3) |
| fixture, JSON-LD structured data | 100% (3/3) |
| live, backlinko.com metadata | 100% (3/3) |
| live, wpbeginner.com social links | 100% (3/3) |
| live, stripe.com/fr-ch social links | 100% (3/3) |

## page-langs

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 30 | 100% | ✓ 100% (30/30) | 0 of 10 | 13 | 21 | 0 | 0.019 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| fixture, English page declared en | 100% (3/3) |
| fixture, es+de body declared en with hreflang fr | 100% (3/3) |
| es.wikipedia.org/wiki/Madrid (Spanish) | 100% (3/3) |
| aem.live (English) | 100% (3/3) |
| fixture, nested lang attribute (en page with a German block) | 100% (3/3) |
| fixture, French page with no language markup | 100% (3/3) |
| fixture, too little text to detect a language | 100% (3/3) |
| live, webflowmarketingmain.com/fr (French, hreflang de/en/fr) | 100% (3/3) |
| live, stripe.com/fr-ch (regional html lang, many hreflang) | 100% (3/3) |
| live, wpbeginner.com (English page, hreflang-only languages) | 100% (3/3) |

## page-prep

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 29 | 46 | 0 | 0.029 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| fixture, cookie banner (reject, never accept) | 100% (3/3) |
| fixture, newsletter modal with scroll lock | 100% (3/3) |
| 20minutes.fr consent wall | 100% (3/3) |
| live, backlinko.com CookieHub dialog | 100% (3/3) |
| live, allbirds.com Shopify privacy banner (agent fallback, the CLI misses it) | 100% (3/3) |

## page-reduce

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 25 | 42 | 0 | 0.041 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| fixture, full reduction | 100% (3/3) |
| fixture, phase 1 only | 100% (3/3) |
| aem.live, full reduction | 100% (3/3) |
| live, wknd-adventures.com, phase 1 only | 100% (3/3) |
| live, stripe.com/fr-ch, phase 1 only | 100% (3/3) |

## page-tree

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 18 | 32 | 0 | 0.018 |

**By case** (share of runs within the floor)

| Case | sonnet-5.5-low |
|---|---|
| fixture, default capture | 100% (3/3) |
| fixture, narrow elements included | 100% (3/3) |
| aem.live, default capture | 100% (3/3) |
| live, stripe.com/fr-ch, long page with grids | 100% (3/3) |
| live, wknd-adventures.com, image-background hero | 100% (3/3) |

## How to read this

- A run passes when every scored assertion holds: the skill was loaded, the files or answer match the ground
  truth, and (for browser tasks) the page is really in the expected state. Slower than the budget counts as a failure.
- The baseline model must meet a skill's floor before other models are run (`scripts/run.sh`). A ⚠ marks a baseline
  that does not, which means the skill or its eval needs work before the other rows mean anything.
- "Lowest model meeting the floor" uses the model order in `models.yaml`, which is a judgment call, not a benchmark.
- Raw promptfoo results stay in `output/`; `npx promptfoo view` browses the evals run on this machine.
