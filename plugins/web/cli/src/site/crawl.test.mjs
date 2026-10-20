import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { crawl, extractLinks, globToRegExp, langOf, parseSitemap } from '#src/site/crawl.mjs';

async function site(routes) {
  const server = createServer((req, res) => {
    const r = routes[req.url];
    if (!r) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': r.type ?? 'text/html' });
    return res.end(typeof r.body === 'function' ? r.body(origin) : r.body);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, close: () => server.close() };
}

const urlset = (...locs) =>
  `<urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join('')}</urlset>`;

test('globToRegExp: * spans slashes, ? is one character, dots are literal', () => {
  assert.ok(globToRegExp('/blog/**').test('/blog/a/b'));
  assert.ok(globToRegExp('/a?').test('/ab'));
  assert.ok(!globToRegExp('/a?').test('/a'));
  assert.ok(!globToRegExp('/a.html').test('/aXhtml'));
});

test('langOf reads a language from the first path segment only', () => {
  assert.equal(langOf('/fr-fr/x'), 'fr-FR');
  assert.equal(langOf('/de/x'), 'de');
  assert.equal(langOf('/blog/x'), '');
  assert.equal(langOf('/'), '');
});

test('parseSitemap decodes entities and tells an index from a urlset', () => {
  assert.deepEqual(parseSitemap(urlset('http://a/x?a=1&amp;b=2')), {
    index: false,
    locs: ['http://a/x?a=1&b=2'],
  });
  assert.equal(
    parseSitemap('<sitemapindex><sitemap><loc>http://a/s.xml</loc></sitemap></sitemapindex>').index,
    true,
  );
});

test('extractLinks resolves relative links and drops fragments and mailto', () => {
  const html = `<a href="/a#top">x</a><a class=c href='b'>y</a><a href="mailto:x@y.z">m</a>`;
  assert.deepEqual(extractLinks(html, 'http://h.test/dir/'), [
    'http://h.test/a',
    'http://h.test/dir/b',
  ]);
});

test('sitemaps: robots.txt, an index, gzip, filters, dedupe and other origins', async () => {
  const s = await site({
    '/robots.txt': { type: 'text/plain', body: (o) => `Sitemap: ${o}/index.xml` },
    '/index.xml': {
      body: (o) =>
        `<sitemapindex><sitemap><loc>${o}/a.xml</loc></sitemap><sitemap><loc>${o}/b.xml.gz</loc></sitemap></sitemapindex>`,
    },
    '/a.xml': {
      body: (o) =>
        urlset(`${o}/en/one`, `${o}/en/one`, `${o}/old/archive/x`, 'http://other.test/z'),
    },
    '/b.xml.gz': {
      type: 'application/gzip',
      body: (o) => gzipSync(urlset(`${o}/fr-fr/deux`, `${o}/en/three?x=1`)),
    },
  });
  try {
    const r = await crawl(s.origin, {
      exclude: ['**/archive/**'],
      include: ['/en/**', '/fr-fr/**'],
    });
    assert.deepEqual(
      r.urls.map((u) => [u.url.replace(s.origin, ''), u.lang]),
      [
        ['/en/one', 'en'],
        ['/fr-fr/deux', 'fr-FR'],
        ['/en/three?x=1', 'en'],
      ],
    );
    assert.equal(r.sitemaps.length, 3);
    assert.deepEqual(r.errors, []);
    assert.equal((await crawl(s.origin, { limit: 1 })).valid, 1);
  } finally {
    s.close();
  }
});

test('sitemaps: no robots.txt falls back to /sitemap.xml; a missing one is an error entry', async () => {
  const s = await site({ '/sitemap.xml': { body: (o) => urlset(`${o}/p`) } });
  try {
    assert.equal((await crawl(s.origin)).valid, 1);
  } finally {
    s.close();
  }
  const empty = await site({});
  try {
    const r = await crawl(empty.origin);
    assert.equal(r.valid, 0);
    assert.ok(r.errors.some((e) => e.message === 'HTTP 404'));
  } finally {
    empty.close();
  }
});

test('http: follows same-origin html links once, skips non-html and respects exclude', async () => {
  const s = await site({
    '/': {
      body: '<a href="/a">a</a><a href="/doc.pdf">p</a><a href="/skip/x">s</a><a href="http://other.test/">o</a>',
    },
    '/a': { body: '<a href="/">home</a><a href="/b#frag">b</a>' },
    '/b': { body: 'end' },
    '/doc.pdf': { type: 'application/pdf', body: 'pdf' },
    '/skip/x': { body: 'no' },
  });
  try {
    const r = await crawl(s.origin, { strategy: 'http', exclude: ['/skip/**'] });
    assert.deepEqual(r.urls.map((u) => u.url.replace(s.origin, '')).sort(), ['/', '/a', '/b']);
  } finally {
    s.close();
  }
});

test('sitemaps: a URL on another origin is dropped even without patterns', async () => {
  const s = await site({
    '/sitemap.xml': { body: (o) => urlset(`${o}/mine`, 'http://other.test/theirs') },
  });
  try {
    const r = await crawl(s.origin);
    assert.deepEqual(
      r.urls.map((u) => u.url.replace(s.origin, '')),
      ['/mine'],
    );
  } finally {
    s.close();
  }
});
