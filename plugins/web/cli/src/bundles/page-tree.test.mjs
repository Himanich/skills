// The bundle is browser code; its pure functions are tested by loading it into a vm with a
// bare `window`. Real renders are covered by test/page-tree-fixtures.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./page-tree.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, { window });
const { processTree } = window.__visualTree;

const node = (tag, selector, bounds, children = [], extra = {}) => ({
  tag,
  selector,
  bounds,
  children,
  ...extra,
});
const box = (x, y, width, height) => ({ x, y, width, height });
// Values born in the vm realm compare by value once copied into this one.
const plain = (n) => JSON.parse(JSON.stringify(n));
const page = (children, height = 4000) => node('BODY', 'body', box(0, 0, 1280, height), children);
const utility = () => node('DIV', '#utility', box(0, 0, 1280, 53), [], { id: 'utility' });
const content = (y, h) =>
  node('DIV', 'div.content', box(0, y, 1280, h), [], { className: 'content' });
const footer = (height) =>
  node('DIV', 'div.footer', box(0, height - 600, 1280, 600), [], { className: 'footer' });

test('processTree: a hairline stays a node (consumers decide what is structure)', () => {
  const bar = node('DIV', 'div.pb', box(0, 128, 1280, 5), [], { className: 'pb' });
  const nav = node('DIV', 'div.nav', box(0, 53, 1280, 80), [], { className: 'nav' });
  const wrapper = node('DIV', 'div.wrap', box(0, 53, 1280, 80), [nav, bar], { className: 'wrap' });
  const { root } = processTree(page([utility(), wrapper, content(133, 3000), footer(4000)]));
  assert.deepEqual(
    plain(root.children[1].children).map((c) => c.bounds.height),
    [80, 5],
  );
});

test('processTree: zero-area leaves go; a zero-area shell with two children hands them up', () => {
  const empty = node('DIV', 'div.empty', box(0, 133, 1280, 0), [], { className: 'empty' });
  const shell = node(
    'DIV',
    'div.shell',
    box(0, 133, 0, 0),
    [
      node('DIV', 'div.x', box(0, 133, 1280, 100), [], { className: 'x' }),
      node('DIV', 'div.y', box(0, 233, 1280, 100), [], { className: 'y' }),
    ],
    { className: 'shell' },
  );
  const { root, promotedToRoot } = processTree(page([utility(), empty, shell, footer(4000)]));
  assert.deepEqual(
    Array.from(root.children, (c) => c.selector),
    ['#utility', 'div.footer', 'div.x', 'div.y'],
  );
  assert.deepEqual(
    [...promotedToRoot].map((n) => n.selector),
    ['div.x', 'div.y'],
  );
});

test('processTree: an escaped child lands on the nearest ancestor that contains it', () => {
  const inner = node('DIV', 'div.inner', box(0, 400, 1280, 100), [], { className: 'inner' });
  const s1 = node('DIV', 'div.s1', box(0, 133, 1280, 50), [], { className: 's1' });
  const small = node('DIV', 'div.small', box(0, 133, 1280, 50), [s1, inner], {
    className: 'small',
  });
  const s2 = node('DIV', 'div.s2', box(0, 600, 1280, 100), [], { className: 's2' });
  const section = node('DIV', 'div.section', box(0, 133, 1280, 1000), [small, s2], {
    className: 'section',
  });
  const { root, promotedToRoot } = processTree(page([utility(), section, footer(4000)]));
  assert.equal(promotedToRoot.size, 0, 'not promoted to the root');
  assert.deepEqual(
    plain(root.children[1].children).map((c) => c.selector),
    ['div.small', 'div.s2', 'div.inner'],
  );
});
