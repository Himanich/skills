import { registerTree } from '#src/commands/page/tree.mjs';
import { registerReduce } from '#src/commands/page/reduce.mjs';
import { registerCollect } from '#src/commands/page/collect.mjs';
import { registerLangs } from '#src/commands/page/langs.mjs';
import { registerOverlays } from '#src/commands/page/overlays.mjs';

/**
 * Register the `page` group.
 * @param {import('commander').Command} program
 * @param {object} deps
 */
export function registerPage(program, deps) {
  const group = program
    .command('page')
    .description('analyze a page: tree, reduce, collect, langs, overlays');
  registerTree(group, deps);
  registerReduce(group, deps);
  registerCollect(group, deps);
  registerLangs(group, deps);
  registerOverlays(group, deps);
}
