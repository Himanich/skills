import { Command, CommanderError } from 'commander';
import { CliError, EXIT } from './errors.mjs';
import { fail } from './output.mjs';
import { registerBrowser } from '#src/commands/browser.mjs';
import { registerProbe } from '#src/commands/probe.mjs';
import { registerExt } from '#src/commands/ext.mjs';
import { registerMask } from '#src/commands/mask.mjs';
import { registerPage } from '#src/commands/page.mjs';


const USAGE_ERRORS = new Set([
  'commander.unknownOption',
  'commander.missingArgument',
  'commander.excessArguments',
  'commander.unknownCommand',
]);

/**
 * Build the root program with all command groups.
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
  registerPage(program, deps);
  registerExt(program, deps);
  registerMask(program, deps);
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
