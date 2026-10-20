import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isUtf8 = (ct) => {
  const m = /charset=["']?([^\s;"']+)/i.exec(ct);
  return !m || /^utf-?8$/i.test(m[1]);
};
const isText = (ct) => ct.includes('html') || ct.includes('css') || ct.includes('javascript');
const isDirectRequest = (req) => {
  const site = req.headers['sec-fetch-site'];
  return !site || site === 'none';
};

function getCookie(header, name) {
  const m = new RegExp(`(?:^|;)\\s*${name}=([^;]*)`).exec(header || '');
  return m ? decodeURIComponent(m[1]) : null;
}

/** Map a URL to `<cacheDir>/<host>_<originHash>/<path>`; `/x` and `/x/` get distinct files. */
export function cachePath(cacheDir, url) {
  const u = new URL(url);
  const hash = createHash('sha256').update(u.origin).digest('hex').slice(0, 8);
  let seg = u.pathname.substring(1);
  if (seg === '' || seg.endsWith('/')) seg += 'index.html';
  else if (!extname(seg)) seg += '/index~.html';
  let p = join(`${u.hostname}_${hash}`, seg);
  if (u.search) {
    let qs = u.search.substring(1);
    if (p.length + qs.length > 200) qs = createHash('md5').update(qs).digest('hex');
    const ext = extname(p);
    p = ext ? `${p.slice(0, -ext.length)}!${qs}${ext}` : `${p}!${qs}`;
  }
  return resolve(cacheDir, p);
}

function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countFiles(join(dir, e.name));
    else if (!e.name.endsWith('.json')) n += 1;
  }
  return n;
}

/** Make same-origin absolute URLs in html/css relative so sub-resources flow through the proxy. */
export function rewriteOrigin(buf, origin, contentType) {
  if (!isUtf8(contentType)) return buf;
  const esc = escapeRe(origin);
  const text = buf
    .toString('utf-8')
    .replace(
      new RegExp(`(src|href|action)\\s*=\\s*(["'])${esc}(/[^"']*)?\\2`, 'gi'),
      (_, attr, q, p) => `${attr}=${q}${p || '/'}${q}`,
    )
    .replace(
      /(srcset)\s*=\s*(["'])([^"']*?)\2/gi,
      (_, attr, q, val) => `${attr}=${q}${val.replace(new RegExp(`${esc}(?=/)`, 'g'), '')}${q}`,
    )
    .replace(
      new RegExp(`url\\(\\s*(['"]?)${esc}(/[^)'"]*?)\\1\\s*\\)`, 'gi'),
      (_, q, p) => `url(${q}${p}${q})`,
    );
  return Buffer.from(text, 'utf-8');
}

/** Rewrite every absolute URL on an `also` origin to a proxy path carrying `_origin`. */
export function rewriteAlso(buf, also, contentType) {
  if (!also.size || !isUtf8(contentType)) return buf;
  let text = buf.toString('utf-8');
  for (const origin of also) {
    // `https://host` and `//host` alike: a page may reference the origin either way.
    const esc = escapeRe(origin.replace(/^https?:/, ''));
    const re = new RegExp(`(?:https?:)?${esc}(/[^\\s"'<>)\\\\]*)?(?![\\w.-])`, 'g');
    const param = `_origin=${encodeURIComponent(origin)}`;
    text = text.replace(re, (_, p) => {
      const path = p || '/';
      return `${path}${path.includes('?') ? '&' : '?'}${param}`;
    });
  }
  return Buffer.from(text, 'utf-8');
}

/**
 * Start a caching reverse proxy on 127.0.0.1. GET/HEAD only; each response is stored as a
 * body file plus a `.json` sidecar `{ headers, status }`.
 * @param {{ port?: number, cacheDir: string, offline?: boolean, timeoutMs?: number,
 *   also?: string[], log?: (line: string) => void }} options `port: 0` picks a free port.
 * @returns {Promise<{ port: number, url: string, stats: object, closed: Promise<void>,
 *   stop: () => Promise<void> }>}
 */
export async function startCacheProxy({
  port = 3001,
  cacheDir,
  offline = false,
  timeoutMs = 30000,
  also = [],
  log = () => {},
}) {
  const dir = resolve(cacheDir);
  mkdirSync(dir, { recursive: true });
  const alsoSet = new Set(also.map((o) => new URL(o).origin));
  // Origins introduced by a direct ?_origin= request; cookie-only requests for others are
  // refused so page JS cannot use the proxy to probe arbitrary hosts.
  const allowed = new Set(alsoSet);
  const inFlight = new Map();
  const stats = { hits: 0, misses: 0, errors: 0 };

  const read = (url) => {
    const fp = cachePath(dir, url);
    if (!existsSync(fp) || !existsSync(`${fp}.json`)) return null;
    const { headers, status } = JSON.parse(readFileSync(`${fp}.json`, 'utf-8'));
    return { body: readFileSync(fp), headers, status };
  };
  const write = (url, { body, headers, status }) => {
    const fp = cachePath(dir, url);
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, body);
    writeFileSync(`${fp}.json`, JSON.stringify({ headers, status }));
  };

  async function fetchAndStore(req, origin, originUrl) {
    log(`[fetch] ${originUrl}`);
    const fwd = { ...req.headers };
    for (const k of ['host', 'cookie', 'connection', 'referer', 'accept-encoding']) delete fwd[k];
    const resp = await fetch(originUrl, {
      method: 'GET',
      headers: fwd,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ct = resp.headers.get('content-type') || 'text/plain';
    let body = Buffer.from(await resp.arrayBuffer());
    const headers = Object.fromEntries(resp.headers);
    for (const k of [
      'content-encoding',
      'content-length',
      'x-frame-options',
      'content-security-policy',
      'set-cookie',
    ]) {
      delete headers[k];
    }
    headers['access-control-allow-origin'] = '*';
    headers['x-page-cache'] = 'miss';
    if (headers.location) {
      try {
        const loc = new URL(headers.location, originUrl);
        if (loc.origin === origin) headers.location = loc.pathname + loc.search;
      } catch {
        // keep the original Location
      }
    }
    if (ct.includes('html') || ct.includes('css')) body = rewriteOrigin(body, origin, ct);
    if (isText(ct)) body = rewriteAlso(body, alsoSet, ct);
    try {
      write(originUrl, { body, headers, status: resp.status });
    } catch (err) {
      log(`[cache-write-error] ${originUrl}: ${err.message}`);
    }
    return { body, headers, status: resp.status };
  }

  const text = (res, status, message, headers = {}) => {
    res.writeHead(status, { 'content-type': 'text/plain', ...headers });
    res.end(message);
  };

  async function handle(req, res) {
    const reqUrl = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return text(res, 405, `Method ${req.method} not allowed.\n`, { allow: 'GET, HEAD' });
    }
    if (reqUrl.pathname === '/__status') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(
        JSON.stringify({ ...stats, cached: countFiles(dir), dir, offline, also: [...alsoSet] }),
      );
    }
    if (reqUrl.pathname === '/__stop') {
      if (!isDirectRequest(req)) return text(res, 403, 'Forbidden.\n');
      text(res, 200, 'Shutting down.\n');
      server.close();
      return server.closeAllConnections();
    }

    const param = reqUrl.searchParams.get('_origin');
    const host = param || getCookie(req.headers.cookie, 'page-cache-origin');
    if (!host) {
      return text(
        res,
        400,
        'Missing ?_origin= parameter.\nUsage: /path?_origin=https://example.com\n',
      );
    }
    let origin;
    try {
      origin = new URL(host).origin;
    } catch {
      return text(res, 400, `Invalid origin URL: ${host}\n`);
    }
    // Only direct requests (navigation, curl) may enrol an origin, never page JS.
    if (param && isDirectRequest(req)) allowed.add(origin);
    if (!offline && !allowed.has(origin)) return text(res, 403, `Origin not allowed: ${origin}\n`);

    // The query goes upstream as sent, minus _origin: re-serialising would turn a bare
    // `$responsive$` into `%24responsive%24=`, another URL to the origin.
    const qs = reqUrl.search
      .slice(1)
      .split('&')
      .filter((p) => p && !p.startsWith('_origin='))
      .join('&');
    const originUrl = `${origin}${reqUrl.pathname}${qs ? `?${qs}` : ''}`;
    // An `also` origin's asset never becomes the page's origin: no cookie.
    const cookie = alsoSet.has(origin)
      ? undefined
      : `page-cache-origin=${encodeURIComponent(origin)}; Path=/`;
    const send = (entry, extra = {}) => {
      const ct = entry.headers['content-type'] || '';
      const body = isText(ct) ? rewriteAlso(entry.body, alsoSet, ct) : entry.body;
      res.writeHead(entry.status, {
        ...entry.headers,
        ...extra,
        ...(cookie ? { 'set-cookie': cookie } : {}),
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const hit = (entry) => {
      stats.hits += 1;
      log(`[hit] ${originUrl}`);
      send(entry, { 'x-page-cache': 'hit', 'access-control-allow-origin': '*' });
    };

    const cached = read(originUrl);
    if (cached) return hit(cached);
    if (offline) {
      stats.misses += 1;
      log(`[miss] ${originUrl} (offline)`);
      return text(res, 504, `Cache miss (offline): ${originUrl}\n`);
    }
    if (inFlight.has(originUrl)) {
      await inFlight.get(originUrl).catch(() => {});
      const fresh = read(originUrl);
      if (fresh) return hit(fresh);
    }
    try {
      stats.misses += 1;
      const promise = fetchAndStore(req, origin, originUrl);
      inFlight.set(originUrl, promise);
      send(await promise);
    } catch (err) {
      stats.errors += 1;
      log(`[error] ${originUrl}: ${err.message}`);
      if (res.headersSent) return undefined;
      return err.name === 'TimeoutError'
        ? text(res, 504, `Fetch timed out: ${originUrl}\n`)
        : text(res, 502, `Proxy error: ${err.message}\n`);
    } finally {
      inFlight.delete(originUrl);
    }
    return undefined;
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      log(`[error] ${err.message}`);
      if (!res.headersSent) text(res, 500, `Proxy error: ${err.message}\n`);
    });
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', ok);
  });
  const actual = server.address().port;
  const closed = new Promise((ok) => server.once('close', ok));
  const stop = () => {
    server.close();
    server.closeAllConnections();
    return closed;
  };
  return { port: actual, url: `http://localhost:${actual}`, stats, closed, stop };
}
