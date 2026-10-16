import { Command, CommanderError } from 'commander';
import { CliError, EXIT } from './errors.mjs';
import { fail } from './output.mjs';
import { registerBrowser } from '#src/commands/browser.mjs';
import { registerProbe } from '#src/commands/probe.mjs';

const GROUPS = {
  page: 'analyze a page: tree, reduce, collect, langs, overlays',
  ext: 'pilot a Chrome extension: launch, open, status, close',
  mask: 'serve a target URL under a fake local HTTPS domain',
};

const USAGE_ERRORS = new Set([
  'commander.unknownOption',
  'commander.missingArgument',
  'commander.excessArguments',
  'commander.unknownCommand',
]);

/**
 * Build the root program with the five command groups.
 * @param {{ driverFactory?: Function, env?: NodeJS.ProcessEnv, stdout?: object,
 *   stderr?: object, registerTestCommands?: Function }} [deps]
 */
export function createProgram(deps = {}) {
  const { env = process.env, stdout = process.stdout, stderr = process.stderr } = deps;
  const program = new Command('web')
    .description('Drive a browser and analyze pages')
    .option('--session <name>', 'browser session name', env.WEB_SESSION)
    .option('--format <format>', 'output format: json or text', 'json')
    .option('--output <dir>', 'directory for artifacts', './.web')
    .option('--headed', 'show the browser window')
    .option('--recipe <file>', 'browser recipe produced by `web probe`')
    .configureOutput({
      writeOut: (s) => stdout.write(s),
      writeErr: (s) => stderr.write(s),
    })
    .showHelpAfterError()
    .showSuggestionAfterError()
    .exitOverride();
  registerBrowser(program, deps);
  registerProbe(program, deps);
  for (const [name, description] of Object.entries(GROUPS)) {
    const group = program.command(name).description(description);
    if (name === 'mask') group.action(() => group.help());
  }
  deps.registerTestCommands?.(program, deps);
  return program;
}

/**
 * Parse argv and return the process exit code.
 * @param {string[]} argv
 * @param {object} [deps]
 * @returns {Promise<number>}
 */
export async function runCli(argv, deps = {}) {
  const { stdout = process.stdout, stderr = process.stderr } = deps;
  try {
    await createProgram(deps).parseAsync(argv);
    return EXIT.OK;
  } catch (err) {
    if (err instanceof CommanderError) {
      const help = err.code === 'commander.helpDisplayed' || err.code === 'commander.help';
      if (help || err.code === 'commander.version') return EXIT.OK;
      if (USAGE_ERRORS.has(err.code)) return EXIT.USAGE;
      return err.exitCode || EXIT.USAGE;
    }
    const wrapped = err instanceof Error ? err : new CliError('INTERNAL', String(err));
    return fail(wrapped, { stdout, stderr });
  }
}
