import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertNotBlocked, classifyPage, detectSignals, findDocumentChain } from './blocked.mjs';

const REDIRECT_REQUESTS = `### Result
1. [GET] http://example.com/ => [301] Moved Permanently
2. [GET] https://www.example.com/ => [200]
3. [GET] https://www.example.com/app.js => [200]`;

test('findDocumentChain returns redirect hops plus the final document', () => {
  assert.deepEqual(findDocumentChain(REDIRECT_REQUESTS, 'https://www.example.com/'), ['1', '2']);
});

test('findDocumentChain ignores the URL fragment', () => {
  assert.deepEqual(
    findDocumentChain(REDIRECT_REQUESTS, 'https://www.example.com/#top'), ['1', '2'],
  );
});

test('findDocumentChain throws when the document is missing', () => {
  assert.throws(
    () => findDocumentChain(REDIRECT_REQUESTS, 'https://other.example/'),
    /main document https:\/\/other\.example\/ not found/,
  );
});

test('detectSignals maps akamai-grn to akamai-server', () => {
  const grn = 'akamai-grn: 0.160f0317.1790256381.30155e76';
  assert.deepEqual(detectSignals([grn], []), ['akamai-server']);
  assert.deepEqual(detectSignals(['content-type: text/html'], []), []);
});

test('classifyPage flags a challenge title with its signal', () => {
  const res = classifyPage({ title: 'Just a moment...', bodyLength: 500 });
  assert.equal(res.blocked, true);
  assert.deepEqual(res.signals, ['cloudflare-challenge']);
});

test('classifyPage flags a near-empty body', () => {
  assert.equal(classifyPage({ title: 'Home', bodyLength: 20 }).blocked, true);
});

test('classifyPage passes a healthy page and reads network signals', () => {
  const res = classifyPage({ title: 'Home', bodyLength: 900, networkLines: ['cf-ray: x'] });
  assert.deepEqual(res, { blocked: false, signals: ['cloudflare-ray'] });
});

test('assertNotBlocked throws BLOCKED with a probe hint', () => {
  assert.throws(
    () => assertNotBlocked({ title: 'Access denied', bodyLength: 900 }),
    (e) => e.code === 'BLOCKED' && /web probe/.test(e.hint),
  );
  assert.doesNotThrow(() => assertNotBlocked({ title: 'Home', bodyLength: 900 }));
});
