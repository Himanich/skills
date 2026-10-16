# Skill eval report

8 skills, 6 models, 660 runs. Models are ordered from lowest to highest tier.
Each cell is the share of runs that passed within the skill's time budget; ✓ means it meets the skill's floor
(see each section), ✗ that it does not, · that the model was not run. Every case is run several times per
model (usually 3) to measure stability: a case is flaky when its repeats disagree, which the per-skill tables count. Numbers rest on small samples (9 to 27 runs
per cell): treat gaps of a few points as noise. Live sites drift, so rerun before relying on one result.

## The gist

- **browser-probe**: haiku-5.5-low
- **cdp-connect**: gemma-4-26b-cf
- **cdp-ext-pilot**: gemma-4-26b-cf
- **page-collect**: gpt-6-sol-low
- **page-langs**: gemma-4-26b-cf
- **page-prep**: haiku-5.5-low
- **page-reduce**: haiku-5.5-low
- **page-tree**: haiku-5.5-low

## Cost of the model choice

| Skill | Lowest sufficient model | $/run | Highest model run | $/run | Savings |
|---|---|---|---|---|---|
| browser-probe | haiku-5.5-low | $0.0021 | opus-5.5-low | $0.059 | 28× cheaper |
| cdp-connect | gemma-4-26b-cf | $0.0028 | opus-5.5-low | $0.036 | 13× cheaper |
| cdp-ext-pilot | gemma-4-26b-cf | $0.0052 | opus-5.5-low | $0.041 | 7.8× cheaper |
| page-collect | gpt-6-sol-low | $0.020 | opus-5.5-low | $0.040 | 2.0× cheaper |
| page-langs | gemma-4-26b-cf | $0.0051 | opus-5.5-low | $0.038 | 7.5× cheaper |
| page-prep | haiku-5.5-low | $0.0072 | opus-5.5-low | $0.236 | 33× cheaper |
| page-reduce | haiku-5.5-low | $0.0054 | opus-5.5-low (misses floor) | $0.126 | 23× cheaper |
| page-tree | haiku-5.5-low | $0.0017 | opus-5.5-low | $0.053 | 31× cheaper |

## Skill x model matrix

| Skill | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low (baseline) | opus-5.5-low | Lowest model meeting the floor |
|---|---|---|---|---|---|---|---|
| [browser-probe](#browser-probe) | ✗ 50% (6/12) | ✗ 42% (5/12) | ✓ 100% (24/24) | ✓ 92% (11/12) | ✓ 100% (12/12) | ✓ 100% (12/12) | **haiku-5.5-low** |
| [cdp-connect](#cdp-connect) | ✓ 94% (17/18) | ✓ 94% (17/18) | ✓ 100% (18/18) | ✓ 94% (17/18) | ✓ 100% (18/18) | ✓ 100% (18/18) | **gemma-4-26b-cf** |
| [cdp-ext-pilot](#cdp-ext-pilot) | ✓ 100% (9/9) | ✗ 89% (8/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | **gemma-4-26b-cf** |
| [page-collect](#page-collect) | ✗ 72% (13/18) | ✗ 72% (13/18) | ✗ 78% (14/18) | ✓ 100% (18/18) | ✓ 100% (18/18) | ✓ 94% (17/18) | **gpt-6-sol-low** |
| [page-langs](#page-langs) | ✓ 95% (20/21) | ✗ 76% (16/21) | ✓ 100% (21/21) | ✓ 100% (21/21) | ✓ 100% (21/21) | ✓ 100% (21/21) | **gemma-4-26b-cf** |
| [page-prep](#page-prep) | ✗ 22% (2/9) | ✗ 33% (3/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | ✓ 93% (25/27) | ✓ 100% (9/9) | **haiku-5.5-low** |
| [page-reduce](#page-reduce) | ✗ 33% (3/9) | ✗ 33% (3/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | ✗ 78% (7/9) | **haiku-5.5-low** |
| [page-tree](#page-tree) | ✗ 44% (4/9) | ✗ 78% (7/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | ✓ 100% (9/9) | **haiku-5.5-low** |

## Without the skill

Same cases and the same graders, but Pi has no skill loaded and the workspace contains none; runs are checked for reads of skill files. The prompt gets one addition: the output format (file names and fields, never how to produce them), because the graders read the skill's own formats. Cases that depend on a skill's own method are left out, and browser-probe is judged on "the recipe really loads the page" only. With-skill figures are restricted to the same cases. Only a few models are run this way: it is a comparison, not a benchmark.

| Skill | Model | With skill | Without skill | Time with / without | Cost with / without |
|---|---|---|---|---|---|
| browser-probe | sonnet-5.5-low | ✓ 100% (12/12) | ✓ 100% (12/12) | 31 s / 24 s | $0.035 / $0.025 |
| browser-probe | haiku-5.5-low | ✓ 100% (24/24) | ✗ 58% (7/12) | 28 s / 63 s | $0.0021 / $0.0032 |
| cdp-connect | haiku-5.5-low | ✓ 100% (18/18) | ✗ 89% (16/18) | 12 s / 12 s | $0.0010 / $0.0013 |
| cdp-connect | sonnet-5.5-low | ✓ 100% (18/18) | ✓ 94% (17/18) | 11 s / 10 s | $0.019 / $0.014 |
| page-collect | sonnet-5.5-low | ✓ 100% (18/18) | ✓ 100% (18/18) | 11 s / 18 s | $0.023 / $0.039 |
| page-collect | haiku-5.5-low | ✗ 78% (14/18) | ✓ 100% (18/18) | 13 s / 29 s | $0.0015 / $0.0047 |
| page-langs | sonnet-5.5-low | ✓ 100% (18/18) | ✗ 83% (15/18) | 9 s / 10 s | $0.018 / $0.016 |
| page-langs | haiku-5.5-low | ✓ 100% (18/18) | ✓ 100% (18/18) | 9 s / 13 s | $0.0013 / $0.0017 |
| page-prep | sonnet-5.5-low | ✓ 93% (25/27) | ✓ 100% (9/9) | 33 s / 12 s | $0.091 / $0.013 |
| page-prep | haiku-5.5-low | ✓ 100% (9/9) | ✓ 100% (9/9) | 31 s / 25 s | $0.0072 / $0.0017 |
| page-reduce | sonnet-5.5-low | ✓ 100% (6/6) | ✗ 50% (3/6) | 28 s / 19 s | $0.077 / $0.045 |
| page-reduce | haiku-5.5-low | ✓ 100% (6/6) | ✗ 83% (5/6) | 44 s / 29 s | $0.0073 / $0.0044 |
| page-tree | haiku-5.5-low | ✓ 100% (9/9) | ✗ 44% (4/9) | 16 s / 38 s | $0.0017 / $0.0035 |
| page-tree | sonnet-5.5-low | ✓ 100% (9/9) | ✗ 78% (7/9) | 13 s / 21 s | $0.027 / $0.037 |

## browser-probe

Floor: ≥ 90% of runs pass within 120 s. Skill ref: fix-web-skills-best-practices, fix-web-skills-best-practices@b3aa00ec.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 12 | 58% | ✗ 50% (6/12) | 2 of 4 | 104 | 121 | 7 | 0.005 |
| qwen3.8-27b-cf | 12 | 75% | ✗ 42% (5/12) | 3 of 4 | 145 | 441 | 0 | 0.048 |
| haiku-5.5-low | 24 | 100% | ✓ 100% (24/24) | 0 of 4 | 28 | 42 | 0 | 0.002 |
| gpt-6-sol-low | 12 | 92% | ✓ 92% (11/12) | 1 of 4 | 26 | 38 | 0 | 0.023 |
| sonnet-5.5-low (baseline) | 12 | 100% | ✓ 100% (12/12) | 0 of 4 | 31 | 44 | 0 | 0.035 |
| opus-5.5-low | 12 | 100% | ✓ 100% (12/12) | 0 of 4 | 35 | 53 | 0 | 0.059 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| wknd | 100% (3/3) | 33% (1/3) | 100% (6/6) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| astrazeneca | 67% (2/3) | 67% (2/3) | 100% (6/6) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| adobe | 0% (0/3) | 67% (2/3) | 100% (6/6) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| bd | 33% (1/3) | 0% (0/3) | 100% (6/6) | 67% (2/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 6× gemma-4-26b-cf: timed out
- 4× qwen3.8-27b-cf: unknown
- 2× gpt-5.4-mini: no recipe to load with
- 1× qwen3.8-27b-cf: recipe url https://wknd.site != https://wknd.site/
- 1× qwen3.8-27b-cf: recipe does not match default: stealth script, user-agent arg
- 1× gpt-5.4-mini: recipe does not match persistent: persistent flag

## cdp-connect

Floor: ≥ 90% of runs pass within 120 s. Skill ref: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 18 | 94% | ✓ 94% (17/18) | 1 of 6 | 51 | 120 | 1 | 0.003 |
| qwen3.8-27b-cf | 18 | 94% | ✓ 94% (17/18) | 1 of 6 | 56 | 120 | 1 | 0.013 |
| haiku-5.5-low | 18 | 100% | ✓ 100% (18/18) | 0 of 6 | 12 | 30 | 0 | 0.001 |
| gpt-6-sol-low | 18 | 94% | ✓ 94% (17/18) | 1 of 6 | 16 | 120 | 1 | 0.014 |
| sonnet-5.5-low (baseline) | 18 | 100% | ✓ 100% (18/18) | 0 of 6 | 11 | 20 | 0 | 0.019 |
| opus-5.5-low | 18 | 100% | ✓ 100% (18/18) | 0 of 6 | 13 | 26 | 0 | 0.036 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| fill and submit the greeter form | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| screenshot | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| network request on load | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| accessible buttons | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| several tabs, click in the right one | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| console output after a reload | 67% (2/3) | 67% (2/3) | 100% (3/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 1× gemma-4-26b-cf: timed out
- 1× qwen3.8-27b-cf: timed out
- 1× gpt-6-sol-low: timed out

## cdp-ext-pilot

Floor: ≥ 90% of runs pass within 150 s. Skill ref: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 57 | 84 | 0 | 0.005 |
| qwen3.8-27b-cf | 9 | 89% | ✗ 89% (8/9) | 1 of 3 | 98 | 150 | 1 | 0.021 |
| haiku-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 11 | 18 | 0 | 0.002 |
| gpt-6-sol-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 15 | 25 | 0 | 0.020 |
| sonnet-5.5-low (baseline) | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 13 | 20 | 0 | 0.023 |
| opus-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 15 | 22 | 0 | 0.041 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| sidepanel, save a note | 100% (3/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| options page screenshot | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| extension id | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 1× qwen3.8-27b-cf: timed out

## page-collect

Floor: ≥ 90% of runs pass within 120 s. Skill ref: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 18 | 72% | ✗ 72% (13/18) | 1 of 6 | 38 | 57 | 0 | 0.002 |
| qwen3.8-27b-cf | 18 | 83% | ✗ 72% (13/18) | 1 of 6 | 89 | 121 | 9 | 0.018 |
| haiku-5.5-low | 18 | 78% | ✗ 78% (14/18) | 3 of 6 | 13 | 24 | 0 | 0.002 |
| gpt-6-sol-low | 18 | 100% | ✓ 100% (18/18) | 0 of 6 | 13 | 18 | 0 | 0.020 |
| sonnet-5.5-low (baseline) | 18 | 100% | ✓ 100% (18/18) | 0 of 6 | 11 | 18 | 0 | 0.023 |
| opus-5.5-low | 18 | 94% | ✓ 94% (17/18) | 1 of 6 | 14 | 23 | 0 | 0.040 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| fixture, full inventory | 100% (3/3) | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, icons for Edge Delivery Services | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, forms only | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| aem.live, full inventory | 100% (3/3) | 100% (3/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 67% (2/3) |
| fixture, icons from sprites, data URIs and inline SVG | 0% (0/3) | 0% (0/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, JSON-LD structured data | 33% (1/3) | 100% (3/3) | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 5× qwen3.8-27b-cf: timed out
- 3× gemma-4-26b-cf: failed checks: icons recolored to currentColor
- 2× haiku-5.5-low: failed checks: organization found
- 2× gemma-4-26b-cf: failed checks: organization found
- 1× haiku-5.5-low: failed checks: icons recolored to currentColor
- 1× haiku-5.5-low: failed checks: all six collectors present

## page-langs

Floor: ≥ 90% of runs pass within 120 s. Skill ref: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 21 | 95% | ✓ 95% (20/21) | 1 of 7 | 70 | 101 | 1 | 0.005 |
| qwen3.8-27b-cf | 21 | 100% | ✗ 76% (16/21) | 4 of 7 | 75 | 120 | 5 | 0.021 |
| haiku-5.5-low | 21 | 100% | ✓ 100% (21/21) | 0 of 7 | 9 | 13 | 0 | 0.001 |
| gpt-6-sol-low | 21 | 100% | ✓ 100% (21/21) | 0 of 7 | 14 | 19 | 0 | 0.020 |
| sonnet-5.5-low (baseline) | 21 | 100% | ✓ 100% (21/21) | 0 of 7 | 9 | 12 | 0 | 0.018 |
| opus-5.5-low | 21 | 100% | ✓ 100% (21/21) | 0 of 7 | 12 | 18 | 0 | 0.038 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| fixture, nested lang attribute (en page with a German block) | 100% (3/3) | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, French page with no language markup | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, too little text to detect a language | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, English page declared en | 100% (3/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, es+de body declared en with hreflang fr | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| es.wikipedia.org/wiki/Madrid (Spanish) | 100% (3/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| aem.live (English) | 100% (3/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 5× qwen3.8-27b-cf: timed out
- 1× gemma-4-26b-cf: timed out

## page-prep

Floor: ≥ 90% of runs pass within 120 s. Skill ref: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 9 | 33% | ✗ 22% (2/9) | 1 of 3 | 93 | 123 | 3 | 0.012 |
| qwen3.8-27b-cf | 9 | 56% | ✗ 33% (3/9) | 2 of 3 | 116 | 123 | 7 | 0.055 |
| haiku-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 31 | 46 | 0 | 0.007 |
| gpt-6-sol-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 27 | 42 | 0 | 0.055 |
| sonnet-5.5-low (baseline) | 27 | 93% | ✓ 93% (25/27) | 1 of 3 | 33 | 120 | 2 | 0.091 |
| opus-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 39 | 76 | 0 | 0.236 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| fixture, cookie banner (reject, never accept) | 0% (0/3) | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (9/9) | 100% (3/3) |
| fixture, newsletter modal with scroll lock | 67% (2/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (9/9) | 100% (3/3) |
| 20minutes.fr consent wall | 0% (0/3) | 0% (0/3) | 100% (3/3) | 100% (3/3) | 78% (7/9) | 100% (3/3) |

**Most common failures**

- 6× qwen3.8-27b-cf: timed out
- 3× gemma-4-26b-cf: failed checks: did not accept tracking
- 3× gemma-4-26b-cf: timed out
- 2× sonnet-5.5-low: timed out
- 1× gemma-4-26b-cf: failed checks: no blocking fixed overlay left

## page-reduce

Floor: ≥ 90% of runs pass within 120 s. Skill ref: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 9 | 33% | ✗ 33% (3/9) | 0 of 3 | 112 | 121 | 7 | 0.006 |
| qwen3.8-27b-cf | 9 | 33% | ✗ 33% (3/9) | 0 of 3 | 116 | 120 | 7 | 0.025 |
| haiku-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 35 | 78 | 0 | 0.005 |
| gpt-6-sol-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 35 | 45 | 0 | 0.050 |
| sonnet-5.5-low (baseline) | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 23 | 36 | 0 | 0.061 |
| opus-5.5-low | 9 | 89% | ✗ 78% (7/9) | 2 of 3 | 42 | 120 | 1 | 0.126 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| fixture, full reduction | 0% (0/3) | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, phase 1 only | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 67% (2/3) |
| aem.live, full reduction | 0% (0/3) | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 67% (2/3) |

**Most common failures**

- 6× qwen3.8-27b-cf: timed out
- 6× gemma-4-26b-cf: timed out
- 1× opus-5.5-low: Missing required skill(s): page-reduce. Actual skills: (none)
- 1× opus-5.5-low: timed out

## page-tree

Floor: ≥ 90% of runs pass within 120 s. Skill ref: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| gemma-4-26b-cf | 9 | 44% | ✗ 44% (4/9) | 3 of 3 | 112 | 120 | 5 | 0.007 |
| qwen3.8-27b-cf | 9 | 89% | ✗ 78% (7/9) | 2 of 3 | 108 | 121 | 4 | 0.026 |
| haiku-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 16 | 25 | 0 | 0.002 |
| gpt-6-sol-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 20 | 25 | 0 | 0.021 |
| sonnet-5.5-low (baseline) | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 13 | 16 | 0 | 0.027 |
| opus-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 17 | 21 | 0 | 0.053 |

**By case** (share of runs within the floor)

| Case | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-6-sol-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|---|---|
| fixture, default capture | 67% (2/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, narrow elements included | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| aem.live, default capture | 33% (1/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 5× gemma-4-26b-cf: timed out
- 2× qwen3.8-27b-cf: timed out

## How to read this

- A run passes when every scored assertion holds: the skill was loaded, the files or answer match the ground
  truth, and (for browser tasks) the page is really in the expected state. Slower than the budget counts as a failure.
- The baseline model must meet a skill's floor before other models are run (`scripts/run.sh`). A ⚠ marks a baseline
  that does not, which means the skill or its eval needs work before the other rows mean anything.
- "Lowest model meeting the floor" uses the model order in `models.yaml`, which is a judgment call, not a benchmark.
- Raw promptfoo results stay in `output/`; `npx promptfoo view` browses the evals run on this machine.
