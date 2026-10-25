'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { parseMenuHtml } = require('./menu-parser.cjs');
const { readPublishedMenus, combineMenus } = require('./published-menu.cjs');

const MENU_SOURCE = 'https://galaxia-krupina.sk/';
const MENU_HOSTS = new Set(['galaxia-krupina.sk', 'www.galaxia-krupina.sk']);
const MAX_HTML_BYTES = 2_000_000;
const CACHE_MS = 15 * 60_000;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.wasm': 'application/wasm',
};

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data:", "connect-src 'self'",
    "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
  ].join('; '));
}

function sendJson(request, response, status, value) {
  const body = JSON.stringify(value);
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Length', Buffer.byteLength(body));
  response.end(request.method === 'HEAD' ? undefined : body);
}

function allowedMenuUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !MENU_HOSTS.has(url.hostname) || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Unexpected menu source');
  }
  return url;
}

async function boundedHtml(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
    await response.body?.cancel();
    throw new Error('Menu source is too large');
  }
  const contentType = response.headers.get('content-type');
  if (contentType && !/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error('Unexpected menu content type');
  }
  if (!response.body) throw new Error('Empty menu source');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const parts = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error('Menu source is too large');
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } finally { reader.releaseLock(); }
}

function createMenuLoader({ fetchImpl, now }) {
  let cache = null;
  let inflight = null;
  let refreshFailed = false;
  async function fetchMenu() {
    const signal = AbortSignal.timeout(10_000);
    let url = new URL(MENU_SOURCE);
    let response;
    // Follow only restaurant-owned redirects, never a client-provided proxy target.
    for (let redirects = 0; redirects <= 3; redirects++) {
      response = await fetchImpl(url.href, {
        headers: { Accept: 'text/html', 'User-Agent': 'MojeObedy/1.0 (personal menu reader)' },
        signal, redirect: 'manual',
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || redirects === 3) throw new Error('Invalid menu redirect');
        url = allowedMenuUrl(new URL(location, url));
        continue;
      }
      break;
    }
    if (!response?.ok) {
      await response?.body?.cancel();
      throw new Error('Menu source unavailable');
    }
    if (response.url) allowedMenuUrl(response.url);
    const days = parseMenuHtml(await boundedHtml(response));
    if (!days.length) throw new Error('No complete menu days found');
    cache = { days, fetchedAt: new Date(now()).toISOString(), timestamp: now() };
    refreshFailed = false;
    return { days: cache.days, fetchedAt: cache.fetchedAt, stale: false };
  }
  return function loadMenu(force = false) {
    if (inflight) return inflight;
    if (!force && !refreshFailed && cache && now() - cache.timestamp >= 0 && now() - cache.timestamp < CACHE_MS) {
      return Promise.resolve({ days: cache.days, fetchedAt: cache.fetchedAt, stale: false });
    }
    inflight = fetchMenu().catch(() => {
      refreshFailed = true;
      return {
        days: cache?.days ?? [], fetchedAt: cache?.fetchedAt ?? null, stale: true,
        error: cache
          ? 'Web Galaxie je momentálne nedostupný. Zobrazuje sa posledný načítaný lístok.'
          : 'Jedálny lístok sa nepodarilo načítať. Skús to, prosím, znova.',
      };
    }).finally(() => { inflight = null; });
    return inflight;
  };
}

function withinRoot(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

/** Testable, dependency-free public handler. Personal drafts never reach this server. */
function createHandler({ fetchImpl = globalThis.fetch, now = Date.now, staticPath = path.join(__dirname, '../frontend/dist'), publishedMenuPath = path.join(__dirname, '../data/menus') } = {}) {
  const staticRoot = path.resolve(staticPath);
  const loadMenu = createMenuLoader({ fetchImpl, now });
  // Published PDF imports are deliberately read once at startup. A malformed
  // import must be fixed before serving traffic rather than silently ignored.
  const publishedMenus = readPublishedMenus(publishedMenuPath);
  async function serveFile(request, response, pathname) {
    const filePath = path.resolve(staticRoot, '.' + pathname);
    if (!withinRoot(staticRoot, filePath)) return sendJson(request, response, 403, { error: 'Táto cesta nie je povolená.' });
    let selected = filePath;
    let stat;
    try { stat = await fs.promises.stat(selected); } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
    const spaRoute = !pathname.split('/').some((segment) => segment.includes('.'));
    if (!stat?.isFile()) {
      if (!spaRoute && pathname !== '/index.html') return sendJson(request, response, 404, { error: 'Súbor sa nenašiel.' });
      selected = path.join(staticRoot, 'index.html');
      try { stat = await fs.promises.stat(selected); } catch { return sendJson(request, response, 503, { error: 'Rozhranie sa ešte pripravuje. Skús to neskôr.' }); }
    }
    const [realRoot, realFile] = await Promise.all([fs.promises.realpath(staticRoot), fs.promises.realpath(selected)]);
    if (!withinRoot(realRoot, realFile) || !stat.isFile()) return sendJson(request, response, 403, { error: 'Táto cesta nie je povolená.' });
    const extension = path.extname(selected).toLowerCase();
    const immutable = /-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(selected);
    response.statusCode = 200;
    response.setHeader('Content-Type', CONTENT_TYPES[extension] || 'application/octet-stream');
    response.setHeader('Cache-Control', extension === '.html' ? 'no-store' : immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    response.setHeader('Content-Length', stat.size);
    if (request.method === 'HEAD') return response.end();
    await pipeline(fs.createReadStream(realFile), response);
  }

  return async function handler(request, response) {
    securityHeaders(response);
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD');
        request.resume();
        return sendJson(request, response, 405, { error: 'Táto metóda nie je podporovaná.' });
      }
      const rawPath = (request.url || '/').split('?')[0];
      let pathname;
      try { pathname = decodeURIComponent(rawPath); } catch { return sendJson(request, response, 400, { error: 'Neplatná adresa.' }); }
      if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\x00-\x1f\x7f\\]/.test(pathname)) {
        return sendJson(request, response, 400, { error: 'Neplatná adresa.' });
      }
      if (pathname.split('/').includes('..')) return sendJson(request, response, 403, { error: 'Táto cesta nie je povolená.' });
      if (pathname.split('/').some((segment) => segment.startsWith('.'))) return sendJson(request, response, 404, { error: 'Stránka sa nenašla.' });
      if (pathname === '/health') return sendJson(request, response, 200, { status: 'ok', version: 'personal-v1' });
      if (pathname === '/api/menu') {
        const query = new URL(request.url, 'http://localhost').searchParams;
        const menu = combineMenus(await loadMenu(query.get('refresh') === '1'), publishedMenus);
        return sendJson(request, response, menu.days.length ? 200 : 503, menu);
      }
      if (pathname === '/api' || pathname.startsWith('/api/')) return sendJson(request, response, 404, { error: 'Táto API adresa neexistuje.' });
      await serveFile(request, response, pathname);
    } catch {
      if (response.headersSent) response.destroy();
      else sendJson(request, response, 500, { error: 'Požiadavku sa nepodarilo dokončiť.' });
    }
  };
}

module.exports = { createHandler, MENU_SOURCE, MAX_HTML_BYTES, CACHE_MS };
