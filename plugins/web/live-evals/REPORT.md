# Skill eval report

8 skills, 7 models, 588 runs. Models are ordered from lowest to highest tier.
Each cell is the share of runs that passed within the skill's time budget; ✓ means it meets the skill's floor
(see each section), ✗ that it does not, · that the model was not run. Every case is run several times per
model (usually 3) to measure stability: a case is flaky when its repeats disagree, which the per-skill tables count. Numbers rest on small samples (9 to 27 runs
per cell): treat gaps of a few points as noise. Live sites drift, so rerun before relying on one result.

## The gist

- **browser-probe**: sonnet-5.5-low
- **cdp-connect**: haiku-5.5-low
- **cdp-ext-pilot**: haiku-5.5-low
- **page-collect**: haiku-5.5-low
- **page-langs**: haiku-5.5-low
- **page-prep**: haiku-5.5-low
- **page-reduce**: haiku-5.5-low
- **page-tree**: haiku-5.5-low

## Cost of the model choice

| Skill | Lowest sufficient model | $/run | Highest model run | $/run | Savings |
|---|---|---|---|---|---|
| browser-probe | sonnet-5.5-low | $0.020 | opus-5.5-low | $0.040 | 1.9× cheaper |
| cdp-connect | haiku-5.5-low | $0.0013 | opus-5.5-low | $0.028 | 21× cheaper |
| cdp-ext-pilot | haiku-5.5-low | $0.0020 | opus-5.5-low | $0.059 | 30× cheaper |
| page-collect | haiku-5.5-low | $0.0014 | opus-5.5-low | $0.046 | 33× cheaper |
| page-langs | haiku-5.5-low | $0.0012 | opus-5.5-low | $0.039 | 31× cheaper |
| page-prep | haiku-5.5-low | $0.0021 | opus-5.5-low | $0.068 | 32× cheaper |
| page-reduce | haiku-5.5-low | $0.0030 | opus-5.5-low | $0.085 | 28× cheaper |
| page-tree | haiku-5.5-low | $0.0014 | opus-5.5-low | $0.044 | 33× cheaper |

## Skill x model matrix

| Skill | gemma-4-26b-cf | qwen3.8-27b-cf | haiku-5.5-low | gpt-5.4-mini | gpt-6-sol-low | sonnet-5.5-low (baseline) | opus-5.5-low | Lowest model meeting the floor |
|---|---|---|---|---|---|---|---|---|
| [browser-probe](#browser-probe) | · | ✗ 0% (0/15) | ✗ 87% (13/15) | · | · | ✓ 100% (15/15) | ✓ 100% (15/15) | **sonnet-5.5-low** |
| [cdp-connect](#cdp-connect) | · | ✗ 5% (1/21) | ✓ 95% (20/21) | · | · | ✓ 100% (21/21) | ✓ 100% (21/21) | **haiku-5.5-low** |
| [cdp-ext-pilot](#cdp-ext-pilot) | · | ✗ 0% (0/9) | ✓ 100% (9/9) | · | · | ✓ 100% (9/9) | ✓ 100% (9/9) | **haiku-5.5-low** |
| [page-collect](#page-collect) | · | ✗ 26% (7/27) | ✓ 100% (27/27) | · | · | ✓ 100% (27/27) | ✓ 100% (27/27) | **haiku-5.5-low** |
| [page-langs](#page-langs) | · | ✗ 67% (20/30) | ✓ 97% (29/30) | · | · | ✓ 100% (30/30) | ✓ 100% (30/30) | **haiku-5.5-low** |
| [page-prep](#page-prep) | · | ✗ 0% (0/15) | ✓ 100% (15/15) | · | · | ✓ 100% (15/15) | ✓ 100% (15/15) | **haiku-5.5-low** |
| [page-reduce](#page-reduce) | · | ✗ 7% (1/15) | ✓ 100% (15/15) | · | · | ✓ 100% (15/15) | ✓ 100% (15/15) | **haiku-5.5-low** |
| [page-tree](#page-tree) | · | ✗ 7% (1/15) | ✓ 100% (15/15) | · | · | ✓ 100% (15/15) | ✓ 100% (15/15) | **haiku-5.5-low** |

## Skill, CLI, or neither

Same cases and the same graders in three arms. `skill + CLI`: the skill is loaded and the `web` CLI is on PATH. `CLI only`: no skill anywhere, the CLI is on PATH and the prompt says `web --help` documents it. `neither`: no skill and no CLI. The two comparison arms get the output format (file names and fields, never how to produce them) appended to the prompt, because the graders read the skill's own formats; runs that open a skill file fail. Cases that depend on a skill's own method are left out, and every cell covers the same cases. Only a few models are run this way: it is a comparison, not a benchmark. `CLI used` is the share of CLI-only runs whose shell commands called `web`.

Comparison rows come from the ref(s): browser-probe → CLI only feat-web-cli, neither feat-web-cli; cdp-connect → CLI only feat-web-cli, neither feat-web-cli; cdp-ext-pilot → CLI only feat-web-cli, neither feat-web-cli; page-collect → CLI only feat-web-cli, neither feat-web-cli; page-langs → CLI only feat-web-cli, neither feat-web-cli; page-prep → CLI only feat-web-cli, neither feat-web-cli; page-reduce → CLI only feat-web-cli, neither feat-web-cli; page-tree → CLI only feat-web-cli, neither feat-web-cli.

| Skill | Model | skill + CLI | CLI only | neither | time (s) | $/run | CLI used |
|---|---|---|---|---|---|---|---|
| browser-probe | qwen3.8-27b-cf | ✗ 0% (0/15) | ✗ 0% (0/15) | ✗ 0% (0/15) | 122 / 126 / 122 | $0.015 / $0.0081 / $0.018 | 67% |
| browser-probe | haiku-5.5-low | ✗ 87% (13/15) | ✗ 53% (8/15) | ✗ 73% (11/15) | 32 / 58 / 47 | $0.0014 / $0.0023 / $0.0034 | 100% |
| browser-probe | sonnet-5.5-low | ✓ 100% (15/15) | ✓ 100% (15/15) | ✓ 93% (14/15) | 29 / 31 / 39 | $0.020 / $0.020 / $0.027 | 47% |
| browser-probe | opus-5.5-low | ✓ 100% (15/15) | ✗ 87% (13/15) | ✓ 93% (14/15) | 37 / 37 / 36 | $0.040 / $0.036 / $0.038 | 100% |
| cdp-connect | qwen3.8-27b-cf | ✗ 5% (1/21) | ✗ 5% (1/21) | ✗ 19% (4/21) | 118 / 121 / 120 | $0.0057 / $0.011 / $0.0081 | 90% |
| cdp-connect | haiku-5.5-low | ✓ 95% (20/21) | ✓ 100% (21/21) | ✓ 90% (19/21) | 16 / 18 / 14 | $0.0013 / $0.0013 / $0.0015 | 90% |
| cdp-connect | sonnet-5.5-low | ✓ 100% (21/21) | ✓ 100% (21/21) | ✗ 86% (18/21) | 14 / 15 / 8 | $0.016 / $0.016 / $0.013 | 100% |
| cdp-connect | opus-5.5-low | ✓ 100% (21/21) | ✓ 100% (21/21) | ✓ 90% (19/21) | 14 / 17 / 12 | $0.028 / $0.029 / $0.027 | 95% |
| cdp-ext-pilot | qwen3.8-27b-cf | ✗ 0% (0/9) | ✗ 33% (3/9) | ✗ 0% (0/9) | 150 / 141 / 150 | $0.022 / $0.022 / $0.0053 | 100% |
| cdp-ext-pilot | haiku-5.5-low | ✓ 100% (9/9) | ✓ 100% (9/9) | ✗ 67% (6/9) | 19 / 19 / 17 | $0.0020 / $0.0016 / $0.0017 | 100% |
| cdp-ext-pilot | sonnet-5.5-low | ✓ 100% (9/9) | ✓ 100% (9/9) | ✗ 56% (5/9) | 23 / 19 / 47 | $0.029 / $0.022 / $0.028 | 100% |
| cdp-ext-pilot | opus-5.5-low | ✓ 100% (9/9) | ✓ 100% (9/9) | ✗ 67% (6/9) | 29 / 24 / 40 | $0.059 / $0.045 / $0.041 | 100% |
| page-collect | qwen3.8-27b-cf | ✗ 26% (7/27) | ✗ 0% (0/27) | ✗ 0% (0/27) | 113 / 123 / 122 | $0.011 / $0.0053 / $0.0084 | 67% |
| page-collect | haiku-5.5-low | ✓ 100% (27/27) | ✓ 93% (25/27) | ✗ 81% (22/27) | 15 / 38 / 39 | $0.0014 / $0.0042 / $0.0053 | 56% |
| page-collect | sonnet-5.5-low | ✓ 100% (27/27) | ✓ 100% (27/27) | ✗ 81% (22/27) | 17 / 18 / 23 | $0.022 / $0.031 / $0.036 | 44% |
| page-collect | opus-5.5-low | ✓ 100% (27/27) | ✓ 100% (27/27) | ✗ 85% (23/27) | 18 / 24 / 32 | $0.046 / $0.060 / $0.088 | 74% |
| page-langs | qwen3.8-27b-cf | ✗ 67% (18/27) | ✗ 7% (2/27) | ✗ 0% (0/27) | 97 / 118 / 122 | $0.011 / $0.0071 / $0.010 | 96% |
| page-langs | haiku-5.5-low | ✓ 96% (26/27) | ✗ 89% (24/27) | ✗ 70% (19/27) | 12 / 16 / 21 | $0.0012 / $0.0015 / $0.0020 | 96% |
| page-langs | sonnet-5.5-low | ✓ 100% (27/27) | ✓ 100% (27/27) | ✗ 89% (24/27) | 13 / 15 / 11 | $0.019 / $0.017 / $0.019 | 78% |
| page-langs | opus-5.5-low | ✓ 100% (27/27) | ✓ 100% (27/27) | ✓ 93% (25/27) | 17 / 16 / 14 | $0.039 / $0.033 / $0.037 | 93% |
| page-prep | qwen3.8-27b-cf | ✗ 0% (0/15) | ✗ 0% (0/15) | ✗ 0% (0/15) | 127 / 128 / 125 | $0.011 / $0.0094 / $0.020 | 100% |
| page-prep | haiku-5.5-low | ✓ 100% (15/15) | ✓ 93% (14/15) | ✓ 93% (14/15) | 31 / 36 / 31 | $0.0021 / $0.0019 / $0.0022 | 93% |
| page-prep | sonnet-5.5-low | ✓ 100% (15/15) | ✓ 100% (15/15) | ✓ 100% (15/15) | 29 / 25 / 21 | $0.029 / $0.018 / $0.018 | 100% |
| page-prep | opus-5.5-low | ✓ 100% (15/15) | ✓ 100% (15/15) | ✓ 100% (15/15) | 43 / 43 / 40 | $0.068 / $0.052 / $0.059 | 100% |
| page-reduce | qwen3.8-27b-cf | ✗ 0% (0/6) | ✗ 0% (0/6) | ✗ 0% (0/6) | 123 / 122 / 122 | $0.0090 / $0.014 / $0.0099 | 100% |
| page-reduce | haiku-5.5-low | ✓ 100% (6/6) | ✗ 50% (3/6) | ✗ 50% (3/6) | 35 / 45 / 34 | $0.0057 / $0.0061 / $0.0056 | 100% |
| page-reduce | sonnet-5.5-low | ✓ 100% (6/6) | ✗ 50% (3/6) | ✗ 50% (3/6) | 31 / 31 / 16 | $0.076 / $0.051 / $0.042 | 67% |
| page-reduce | opus-5.5-low | ✓ 100% (6/6) | ✗ 67% (4/6) | ✗ 50% (3/6) | 41 / 41 / 28 | $0.152 / $0.105 / $0.078 | 100% |
| page-tree | qwen3.8-27b-cf | ✗ 7% (1/15) | ✗ 7% (1/15) | ✗ 0% (0/15) | 121 / 118 / 122 | $0.0067 / $0.011 / $0.0054 | 87% |
| page-tree | haiku-5.5-low | ✓ 100% (15/15) | ✓ 100% (15/15) | ✗ 40% (6/15) | 24 / 27 / 53 | $0.0014 / $0.0022 / $0.0041 | 100% |
| page-tree | sonnet-5.5-low | ✓ 100% (15/15) | ✓ 93% (14/15) | ✗ 67% (10/15) | 18 / 26 / 29 | $0.018 / $0.024 / $0.044 | 100% |
| page-tree | opus-5.5-low | ✓ 100% (15/15) | ✓ 93% (14/15) | ✗ 47% (7/15) | 21 / 25 / 33 | $0.044 / $0.042 / $0.081 | 100% |

- browser-probe · qwen3.8-27b-cf: the skill adds 0 points over CLI only; the CLI adds 0 points over neither; CLI only does not reach the floor (90%).
- browser-probe · haiku-5.5-low: the skill adds 33 points over CLI only; the CLI adds -20 points over neither; CLI only does not reach the floor (90%).
- browser-probe · sonnet-5.5-low: the skill adds 0 points over CLI only; the CLI adds 7 points over neither; CLI only reaches the floor (90%).
- browser-probe · opus-5.5-low: the skill adds 13 points over CLI only; the CLI adds -7 points over neither; CLI only does not reach the floor (90%).
- cdp-connect · qwen3.8-27b-cf: the skill adds 0 points over CLI only; the CLI adds -14 points over neither; CLI only does not reach the floor (90%).
- cdp-connect · haiku-5.5-low: the skill adds -5 points over CLI only; the CLI adds 10 points over neither; CLI only reaches the floor (90%).
- cdp-connect · sonnet-5.5-low: the skill adds 0 points over CLI only; the CLI adds 14 points over neither; CLI only reaches the floor (90%).
- cdp-connect · opus-5.5-low: the skill adds 0 points over CLI only; the CLI adds 10 points over neither; CLI only reaches the floor (90%).
- cdp-ext-pilot · qwen3.8-27b-cf: the skill adds -33 points over CLI only; the CLI adds 33 points over neither; CLI only does not reach the floor (90%).
- cdp-ext-pilot · haiku-5.5-low: the skill adds 0 points over CLI only; the CLI adds 33 points over neither; CLI only reaches the floor (90%).
- cdp-ext-pilot · sonnet-5.5-low: the skill adds 0 points over CLI only; the CLI adds 44 points over neither; CLI only reaches the floor (90%).
- cdp-ext-pilot · opus-5.5-low: the skill adds 0 points over CLI only; the CLI adds 33 points over neither; CLI only reaches the floor (90%).
- page-collect · qwen3.8-27b-cf: the skill adds 26 points over CLI only; the CLI adds 0 points over neither; CLI only does not reach the floor (90%).
- page-collect · haiku-5.5-low: the skill adds 7 points over CLI only; the CLI adds 11 points over neither; CLI only reaches the floor (90%).
- page-collect · sonnet-5.5-low: the skill adds 0 points over CLI only; the CLI adds 19 points over neither; CLI only reaches the floor (90%).
- page-collect · opus-5.5-low: the skill adds 0 points over CLI only; the CLI adds 15 points over neither; CLI only reaches the floor (90%).
- page-langs · qwen3.8-27b-cf: the skill adds 59 points over CLI only; the CLI adds 7 points over neither; CLI only does not reach the floor (90%).
- page-langs · haiku-5.5-low: the skill adds 7 points over CLI only; the CLI adds 19 points over neither; CLI only does not reach the floor (90%).
- page-langs · sonnet-5.5-low: the skill adds 0 points over CLI only; the CLI adds 11 points over neither; CLI only reaches the floor (90%).
- page-langs · opus-5.5-low: the skill adds 0 points over CLI only; the CLI adds 7 points over neither; CLI only reaches the floor (90%).
- page-prep · qwen3.8-27b-cf: the skill adds 0 points over CLI only; the CLI adds 0 points over neither; CLI only does not reach the floor (90%).
- page-prep · haiku-5.5-low: the skill adds 7 points over CLI only; the CLI adds 0 points over neither; CLI only reaches the floor (90%).
- page-prep · sonnet-5.5-low: the skill adds 0 points over CLI only; the CLI adds 0 points over neither; CLI only reaches the floor (90%).
- page-prep · opus-5.5-low: the skill adds 0 points over CLI only; the CLI adds 0 points over neither; CLI only reaches the floor (90%).
- page-reduce · qwen3.8-27b-cf: the skill adds 0 points over CLI only; the CLI adds 0 points over neither; CLI only does not reach the floor (90%).
- page-reduce · haiku-5.5-low: the skill adds 50 points over CLI only; the CLI adds 0 points over neither; CLI only does not reach the floor (90%).
- page-reduce · sonnet-5.5-low: the skill adds 50 points over CLI only; the CLI adds 0 points over neither; CLI only does not reach the floor (90%).
- page-reduce · opus-5.5-low: the skill adds 33 points over CLI only; the CLI adds 17 points over neither; CLI only does not reach the floor (90%).
- page-tree · qwen3.8-27b-cf: the skill adds 0 points over CLI only; the CLI adds 7 points over neither; CLI only does not reach the floor (90%).
- page-tree · haiku-5.5-low: the skill adds 0 points over CLI only; the CLI adds 60 points over neither; CLI only reaches the floor (90%).
- page-tree · sonnet-5.5-low: the skill adds 7 points over CLI only; the CLI adds 27 points over neither; CLI only reaches the floor (90%).
- page-tree · opus-5.5-low: the skill adds 7 points over CLI only; the CLI adds 47 points over neither; CLI only reaches the floor (90%).

## browser-probe

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices, fix-web-skills-best-practices@b3aa00ec.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 15 | 60% | ✗ 0% (0/15) | 0 of 5 | 122 | 133 | 12 | 0.015 |
| haiku-5.5-low | 15 | 87% | ✗ 87% (13/15) | 2 of 5 | 32 | 63 | 0 | 0.001 |
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 29 | 52 | 0 | 0.020 |
| opus-5.5-low | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 37 | 72 | 0 | 0.040 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| wknd | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| astrazeneca | 0% (0/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) |
| adobe | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| bd | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| stripe | 0% (0/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 12× qwen3.8-27b-cf: timed out
- 1× haiku-5.5-low: check crashed on the agent's output: Command failed: playwright-cli -s=verify-cN open http
- 1× haiku-5.5-low: check crashed on the agent's output: Command failed: playwright-cli -s=verify-NfNfaN open 
- 1× qwen3.8-27b-cf: check crashed on the agent's output: Command failed: playwright-cli -s=verify-NeNbN open h
- 1× qwen3.8-27b-cf: check crashed on the agent's output: Command failed: playwright-cli -s=verify-NaN eval doc
- 1× qwen3.8-27b-cf: check crashed on the agent's output: Command failed: playwright-cli -s=verify-cNafNcNc eva

## cdp-connect

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 21 | 5% | ✗ 5% (1/21) | 1 of 7 | 118 | 120 | 20 | 0.006 |
| haiku-5.5-low | 21 | 95% | ✓ 95% (20/21) | 1 of 7 | 16 | 46 | 0 | 0.001 |
| sonnet-5.5-low (baseline) | 21 | 100% | ✓ 100% (21/21) | 0 of 7 | 14 | 43 | 0 | 0.016 |
| opus-5.5-low | 21 | 100% | ✓ 100% (21/21) | 0 of 7 | 14 | 44 | 0 | 0.028 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| fill and submit the greeter form | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| screenshot | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| network request on load | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| accessible buttons | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| several tabs, click in the right one | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| console output after a reload | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, open basecamp.com and read the title | 33% (1/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 20× qwen3.8-27b-cf: timed out
- 1× haiku-5.5-low: Missing required skill(s): cdp-connect. Actual skills: (none)

## cdp-ext-pilot

Floor: ≥ 90% of runs pass within 150 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 9 | 0% | ✗ 0% (0/9) | 0 of 3 | 150 | 150 | 9 | 0.022 |
| haiku-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 19 | 27 | 0 | 0.002 |
| sonnet-5.5-low (baseline) | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 23 | 37 | 0 | 0.029 |
| opus-5.5-low | 9 | 100% | ✓ 100% (9/9) | 0 of 3 | 29 | 64 | 0 | 0.059 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| sidepanel, save a note | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| options page screenshot | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| extension id | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 9× qwen3.8-27b-cf: timed out

## page-collect

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 27 | 63% | ✗ 26% (7/27) | 5 of 9 | 113 | 122 | 20 | 0.011 |
| haiku-5.5-low | 27 | 100% | ✓ 100% (27/27) | 0 of 9 | 15 | 18 | 0 | 0.001 |
| sonnet-5.5-low (baseline) | 27 | 100% | ✓ 100% (27/27) | 0 of 9 | 17 | 41 | 0 | 0.022 |
| opus-5.5-low | 27 | 100% | ✓ 100% (27/27) | 0 of 9 | 18 | 23 | 0 | 0.046 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| fixture, full inventory | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, icons for Edge Delivery Services | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, forms only | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| aem.live, full inventory | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, icons from sprites, data URIs and inline SVG | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, JSON-LD structured data | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, backlinko.com metadata | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, wpbeginner.com social links | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, stripe.com/fr-ch social links | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 20× qwen3.8-27b-cf: timed out

## page-langs

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 30 | 87% | ✗ 67% (20/30) | 6 of 10 | 97 | 120 | 10 | 0.011 |
| haiku-5.5-low | 30 | 97% | ✓ 97% (29/30) | 1 of 10 | 13 | 19 | 0 | 0.001 |
| sonnet-5.5-low (baseline) | 30 | 100% | ✓ 100% (30/30) | 0 of 10 | 13 | 21 | 0 | 0.019 |
| opus-5.5-low | 30 | 100% | ✓ 100% (30/30) | 0 of 10 | 16 | 25 | 0 | 0.039 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| fixture, English page declared en | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, es+de body declared en with hreflang fr | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| es.wikipedia.org/wiki/Madrid (Spanish) | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| aem.live (English) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, nested lang attribute (en page with a German block) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, French page with no language markup | 33% (1/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) |
| fixture, too little text to detect a language | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, webflowmarketingmain.com/fr (French, hreflang de/en/fr) | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, stripe.com/fr-ch (regional html lang, many hreflang) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, wpbeginner.com (English page, hreflang-only languages) | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 10× qwen3.8-27b-cf: timed out
- 1× haiku-5.5-low: langs.json missing or invalid

## page-prep

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 15 | 53% | ✗ 0% (0/15) | 0 of 5 | 127 | 134 | 15 | 0.011 |
| haiku-5.5-low | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 31 | 84 | 0 | 0.002 |
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 29 | 46 | 0 | 0.029 |
| opus-5.5-low | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 43 | 113 | 0 | 0.068 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| fixture, cookie banner (reject, never accept) | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, newsletter modal with scroll lock | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| 20minutes.fr consent wall | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, backlinko.com CookieHub dialog | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, allbirds.com Shopify privacy banner (agent fallback, the CLI misses it) | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 15× qwen3.8-27b-cf: timed out

## page-reduce

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 15 | 27% | ✗ 7% (1/15) | 1 of 5 | 121 | 124 | 14 | 0.011 |
| haiku-5.5-low | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 25 | 44 | 0 | 0.003 |
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 25 | 42 | 0 | 0.041 |
| opus-5.5-low | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 30 | 57 | 0 | 0.085 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| fixture, full reduction | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, phase 1 only | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| aem.live, full reduction | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, wknd-adventures.com, phase 1 only | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, stripe.com/fr-ch, phase 1 only | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 14× qwen3.8-27b-cf: timed out

## page-tree

Floor: ≥ 90% of runs pass within 120 s. 

Skill ref: feat-web-cli (1b65386f). Earlier refs, not pooled: fix-web-skills-best-practices.

| Model | Runs | Passed | Within floor | Flaky cases | Avg s | p95 s | Timeouts | $/run |
|---|---|---|---|---|---|---|---|---|
| qwen3.8-27b-cf | 15 | 40% | ✗ 7% (1/15) | 1 of 5 | 121 | 124 | 14 | 0.007 |
| haiku-5.5-low | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 24 | 102 | 0 | 0.001 |
| sonnet-5.5-low (baseline) | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 18 | 32 | 0 | 0.018 |
| opus-5.5-low | 15 | 100% | ✓ 100% (15/15) | 0 of 5 | 21 | 33 | 0 | 0.044 |

**By case** (share of runs within the floor)

| Case | qwen3.8-27b-cf | haiku-5.5-low | sonnet-5.5-low | opus-5.5-low |
|---|---|---|---|---|
| fixture, default capture | 33% (1/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| fixture, narrow elements included | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| aem.live, default capture | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, stripe.com/fr-ch, long page with grids | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| live, wknd-adventures.com, image-background hero | 0% (0/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |

**Most common failures**

- 14× qwen3.8-27b-cf: timed out

## How to read this

- A run passes when every scored assertion holds: the skill was loaded, the files or answer match the ground
  truth, and (for browser tasks) the page is really in the expected state. Slower than the budget counts as a failure.
- The baseline model must meet a skill's floor before other models are run (`scripts/run.sh`). A ⚠ marks a baseline
  that does not, which means the skill or its eval needs work before the other rows mean anything.
- "Lowest model meeting the floor" uses the model order in `models.yaml`, which is a judgment call, not a benchmark.
- Raw promptfoo results stay in `output/`; `npx promptfoo view` browses the evals run on this machine.
