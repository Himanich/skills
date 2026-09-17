# Recorded Copilot smoke runs

One entry per run kept as release evidence. Full logs stay local under `results/`.

## 2026-09-17 — branch stardust/copilot-4-smoke (stardust 0.22.0 + PRs #368–#371), impeccable 4.3.1


- CLI: GitHub Copilot CLI 1.0.85.
- plugin: /Users/paolo/stardust/source/170926/skills/plugins/stardust
- plugins:  • impeccable@impeccable (v4.3.1) • stardust (v0.22.0) 


```
PASS  listing: all 15 stardust skills and impeccable present
PASS  skill(extract) loads by bare name
PASS  setup: impeccable found
PASS  setup: no missing file or command
PASS  setup: does not call the removed load-context.mjs
passed 5, failed 0 — log: /Users/paolo/stardust/source/170926/skills/plugins/stardust/evals/copilot-smoke/results/20260917T154251Z.md
```

Setup report returned by the model (test 3), abridged:

```
```

First attempt the same day scored 4/5: the model counted the legitimately absent `PRODUCT.md`/`DESIGN.md` of an empty project as a setup failure. The prompt now excludes absent project state; the recorded run is the second attempt.
