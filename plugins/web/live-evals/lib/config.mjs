import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { HEADLESS_PRELUDE } from './headless.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE_URL = 'http://localhost:8765';

// SKILLS=off runs the same cases with the skill withheld: nothing loaded, nothing on disk.
const skillsOff = process.env.SKILLS === 'off';
// The no-skill arm lives outside the repo, under a private $HOME with no skills in it, so an agent that
// wanders (cd .., ls ~/.claude/skills) finds no skill of any kind. scripts/setup.sh builds it.
export const NOSKILL_ROOT = '/tmp/skill-evals-noskill';

/**
 * Builds a promptfoo config for one skill: the models.yaml matrix as providers, the skill
 * (plus any sibling skills) loaded from workspace/<skill>, and the shared hooks.
 *
 * @param {object} o
 * @param {string} o.skill        skill folder name; also the workspace and results key
 * @param {string} o.suiteDir     directory of the calling suite (assertion files are resolved from it)
 * @param {string} o.prompt       prompt template; may use {{vars}} of the tests
 * @param {object[]} o.tests      promptfoo tests ({description, vars, assert?})
 * @param {object[]} [o.assert]   assertions applied to every test; `file` names are relative to suiteDir
 * @param {string[]} [o.siblings] other skills copied next to the skill under test
 * @param {number} [o.timeoutS]   hard budget per run, counted as a failure when exceeded
 * @param {number} [o.concurrency]
 * @param {string[]} [o.extensions] extra promptfoo extension hooks (file://path:fn)
 * @param {object} [o.shellEnv]   extra variables exported before every shell command the agent runs
 * @param {string} [o.contract]   no-skill arm only: the output format, appended to the prompt. It names files and
 *                                fields the graders read, never how to produce them.
 * @param {object[]} [o.assertNoSkill] no-skill arm only: replaces `assert` when some checks depend on the skill's method
 * Tests with `metadata: {noskill: 'skip'}` are left out of the no-skill arm.
 */
export function buildConfig({ skill, suiteDir, prompt, tests, assert = [], siblings = [], timeoutS = 120, concurrency = 4, extensions = [], shellEnv = {}, contract = '', assertNoSkill }) {
  const models = parse(readFileSync(join(root, 'models.yaml'), 'utf-8'));
  const workspace = skillsOff ? join(NOSKILL_ROOT, skill) : join(root, 'workspace', skill);
  const skillPaths = skillsOff ? [] : [skill, ...siblings].map((s) => join(workspace, '.claude/skills', s));
  return {
    description: `${skill} live evals${skillsOff ? ' (no skill)' : ''}`,
    prompts: [skillsOff ? `${prompt}\n\n${contract}\nRun every browser headless: never use --headed and never open a visible window.`.trim() : prompt],
    providers: models.map((m) => ({
      id: `file://${join(root, 'providers/pi-provider.mjs')}`,
      label: m.label,
      config: {
        model_label: m.label,
        working_dir: workspace,
        workspace_root: skillsOff ? join(NOSKILL_ROOT, 'live-out', skill) : join(root, 'live-out', skill),
        skills: skillPaths,
        timeout_ms: timeoutS * 1000,
        shell_env: { PLAYWRIGHT_CLI_SESSION: 'run-{run_id}', ...(skillsOff ? { HOME: join(NOSKILL_ROOT, 'home') } : {}), ...shellEnv },
        shell_prelude: HEADLESS_PRELUDE,
      },
    })),
    extensions: [`file://${join(root, 'lib/hooks.mjs')}:extensionHook`, ...extensions],
    defaultTest: {
      assert: [
        { type: 'javascript', value: `file://${join(root, 'lib/headless.mjs')}:headlessOnly` },
        ...(skillsOff ? [{ type: 'javascript', value: `file://${join(root, 'lib/noskill-assert.mjs')}:noSkillAvailable` }] : [{ type: 'skill-used', value: skill }]),
        ...(skillsOff && assertNoSkill ? assertNoSkill : assert).map(({ file, fn, ...rest }) => ({ type: 'javascript', value: `file://${join(suiteDir, file)}:${fn}`, ...rest })),
        { type: 'latency', threshold: 60_000, weight: 0 },
      ],
    },
    evaluateOptions: { maxConcurrency: concurrency, timeoutMs: (timeoutS + 30) * 1000 },
    tests: skillsOff ? tests.filter((t) => t.metadata?.noskill !== 'skip') : tests,
  };
}
