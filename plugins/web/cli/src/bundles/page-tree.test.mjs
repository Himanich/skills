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

test('layoutChildren walks through display: contents elements to the boxes they hold', () => {
  const { layoutChildren } = window.__visualTree;
  const el = (name, display, children = []) => ({ name, display, children });
  const styles = (e) => ({ display: e.display });
  const main = el('main', 'contents', [el('article', 'block'), el('aside', 'block')]);
  const wrapper = el('div', 'block', [el('nav', 'block'), main, el('footer', 'block')]);
  assert.deepEqual(
    plain(layoutChildren(wrapper, styles).map((e) => e.name)),
    ['nav', 'article', 'aside', 'footer'],
  );
  const nested = el('div', 'block', [el('a', 'contents', [el('b', 'contents', [el('c', 'block')])])]);
  assert.deepEqual(plain(layoutChildren(nested, styles).map((e) => e.name)), ['c']);
});

test('clippedAway: a clip-path that leaves no width or no height hides the element', () => {
  const { clippedAway } = window.__visualTree;
  const rect = { width: 1280, height: 370 };
  const hidden = (clipPath) => clippedAway({ clipPath }, rect);
  assert.equal(hidden('inset(0px 0px 100%)'), true, 'a closed mega menu');
  assert.equal(hidden('inset(50%)'), true, 'one value for all four sides');
  assert.equal(hidden('inset(0px 640px 0px 640px)'), true, 'no width left');
  assert.equal(hidden('circle(0px at 50% 50%)'), true);
  assert.equal(hidden('inset(10px)'), false, 'a small inset leaves a box');
  assert.equal(hidden('inset(0px 0px 50%)'), false);
  assert.equal(hidden('circle(50% at 50% 50%)'), false);
  assert.equal(hidden('polygon(0px 0px, 100% 0px, 100% 100%)'), false);
  assert.equal(hidden('none'), false);
  assert.equal(clippedAway({}, rect), false, 'no clip-path at all');
});

test('processTree: a fixed element is never absorbed by a collapse; it floats to root', () => {
  const banner = node('DIV', '#cmp', box(0, 520, 1280, 200), [], { id: 'cmp', fixed: true });
  const deeper = node('DIV', 'div.deeper', box(0, 133, 1280, 0), [banner], {
    className: 'deeper',
  });
  const main = node('DIV', 'div.content', box(0, 53, 1280, 3000), [deeper], {
    className: 'content',
  });
  const { root, nodeMap, promotedToRoot } = processTree(page([utility(), main, footer(4000)]));
  assert.deepEqual(
    [...promotedToRoot].map((n) => n.selector),
    ['#cmp'],
  );
  assert.deepEqual(
    Array.from(root.children, (c) => c.selector),
    ['#utility', 'div.content', 'div.footer', '#cmp'],
  );
  assert.deepEqual(plain(nodeMap.rc4.overlay), { occluding: ['rc2'] });
});

test('processTree: a fixed element goes to the root even when an ancestor contains it', () => {
  const chat = node('DIV', '#chat', box(960, 400, 300, 60), [], { id: 'chat', fixed: true });
  const card = node('DIV', 'div.card', box(0, 300, 1280, 50), [], { className: 'card' });
  const inner = node('DIV', 'div.inner', box(0, 300, 1280, 50), [card, chat], {
    className: 'inner',
  });
  const section = node('DIV', 'div.section', box(0, 53, 1280, 1000), [inner], {
    className: 'section',
  });
  const { root } = processTree(page([section, footer(4000)]));
  assert.deepEqual(
    Array.from(root.children, (c) => c.selector),
    ['div.section', 'div.footer', '#chat'],
  );
});

test('processTree: a row overhanging its container by a gutter stays in it', () => {
  // Grid rows have negative margins: 878 px inside an 848 px container.
  const col = (x) => node('DIV', `div.col${x}`, box(x, 150, 439, 400), [], { className: 'col' });
  const row = node('DIV', 'div.row', box(348, 150, 878, 400), [col(348), col(787)], {
    className: 'row',
  });
  const title = node('H2', 'h2', box(363, 100, 848, 50));
  const container = node('DIV', 'div.container', box(363, 100, 848, 450), [title, row], {
    className: 'container',
  });
  const { root, promotedToRoot } = processTree(page([utility(), container, footer(4000)]));
  assert.equal(promotedToRoot.size, 0, 'nothing escaped');
  assert.deepEqual(
    plain(root.children[1].children).map((c) => c.selector),
    ['h2', 'div.row'],
  );
});

test('processTree: a child three quarters outside its parent still escapes', () => {
  const half = node('DIV', 'div.half', box(0, 300, 1280, 400), [], { className: 'half' });
  const bar = node('DIV', 'div.bar', box(0, 0, 1280, 100), [], { className: 'bar' });
  const host = node('DIV', 'div.host', box(0, 0, 1280, 400), [bar, half], { className: 'host' });
  const { promotedToRoot } = processTree(page([host, content(700, 2000)]));
  assert.deepEqual(
    [...promotedToRoot].map((n) => n.selector),
    ['div.half'],
  );
});

test('isContainedIn: no overlap, or a zero-area child outside, is not contained', () => {
  const { isContainedIn } = window.__visualTree;
  const parent = box(0, 0, 1000, 100);
  assert.equal(isContainedIn(box(0, 100, 1000, 300), parent), false, 'a dropdown below');
  assert.equal(isContainedIn(box(1100, 0, 200, 100), parent), false, 'a banner beside it');
  assert.equal(isContainedIn(box(0, 500, 1000, 0), parent), false);
  assert.equal(isContainedIn(box(1, 1, 998, 98), parent), true);
});

test('processTree: content overflowing a parent that clips it does not escape', () => {
  // A logo marquee: the track is 6000 px wide inside a 1280 px strip with overflow hidden.
  const track = node('UL', 'ul.track', box(-500, 200, 6000, 72), [], { className: 'track' });
  const title = node('H2', 'h2', box(0, 133, 1280, 60));
  const strip = node('DIV', 'div.strip', box(0, 133, 1280, 140), [title, track], {
    className: 'strip',
    clips: 'xy',
  });
  const { root, promotedToRoot } = processTree(page([utility(), strip, footer(4000)]));
  assert.equal(promotedToRoot.size, 0);
  assert.deepEqual(
    plain(root.children[1].children).map((c) => c.selector),
    ['h2', 'ul.track'],
  );
});

test('processTree: clipping one axis does not hold a child escaping along the other', () => {
  const menu = node('DIV', 'div.menu', box(0, 133, 1280, 400), [], { className: 'menu' });
  const bar = node('DIV', 'div.bar', box(0, 53, 1280, 80), [], { className: 'bar' });
  const nav = node('NAV', 'nav', box(0, 53, 1280, 80), [bar, menu], { clips: 'x' });
  const { promotedToRoot } = processTree(page([utility(), nav, content(133, 3000)]));
  assert.deepEqual(
    [...promotedToRoot].map((n) => n.selector),
    ['div.menu'],
  );
});

test('processTree: a collapse keeps the clip of the element it absorbs', () => {
  const slide = (x) => node('DIV', `div.s${x}`, box(x, 200, 1246, 256), [], { className: 's' });
  const track = node('DIV', 'div.track', box(17, 200, 1246, 256), [slide(17), slide(1263)], {
    className: 'track',
    clips: 'xy',
  });
  const wrap = node('DIV', 'div.wrap', box(17, 200, 1246, 256), [track], { className: 'wrap' });
  const { root, promotedToRoot } = processTree(page([utility(), wrap, footer(4000)]));
  assert.equal(promotedToRoot.size, 0, 'the off-screen slide is clipped, not an overlay');
  assert.equal(root.children[1].clips, 'xy');
  assert.equal(root.children[1].children.length, 2);
});

test('hiddenStyle: zero size on an axis that clips hides the element and its subtree', () => {
  const { hiddenStyle } = window.__visualTree;
  const style = (overflowX, overflowY) => ({ overflowX, overflowY });
  const flat = { width: 1280, height: 0 };
  assert.equal(hiddenStyle(style('hidden', 'hidden'), flat), true, 'a closed accordion');
  assert.equal(hiddenStyle(style('clip', 'visible'), flat), false, 'only x clips');
  assert.equal(hiddenStyle(style('visible', 'visible'), flat), false, 'a transparent header');
  assert.equal(hiddenStyle(style('hidden', 'hidden'), { width: 1280, height: 80 }), false);
});
