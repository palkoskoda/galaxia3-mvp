'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createHandler, MENU_SOURCE, MAX_HTML_BYTES, CACHE_MS } = require('../server/app.cjs');
const { parseMenuHtml } = require('../server/menu-parser.cjs');

const fixturePromise = fs.readFile(path.join(__dirname, 'fixtures/galaxia.html'), 'utf8');
const htmlResponse = (html) => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });

async function setup(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'galaxia-server-test-'));
  const publicRoot = path.join(directory, 'public');
  await fs.mkdir(path.join(publicRoot, 'assets'), { recursive: true });
  await fs.writeFile(path.join(publicRoot, 'index.html'), '<!doctype html><html lang="sk"><div id="root">Moje obedy</div><script src="/assets/app-abcdef12.js"></script></html>');
  await fs.writeFile(path.join(publicRoot, 'assets/app-abcdef12.js'), 'console.log("Moje obedy");');
  await fs.writeFile(path.join(publicRoot, 'assets/styles.css'), 'body{color:green}');
  await fs.writeFile(path.join(directory, 'private.txt'), 'must never leave the server');
  let calls = 0;
  const fetchImpl = options.fetchImpl || (async () => { calls++; return htmlResponse(await fixturePromise); });
  const server = http.createServer(createHandler({ staticPath: publicRoot, ...options, fetchImpl }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve, reject) => { server.close((error) => error ? reject(error) : resolve()); server.closeAllConnections(); });
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('galaxia-server-test-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  return { origin, publicRoot, directory, calls: () => calls };
}

function rawRequest(origin, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const request = http.request(origin, { path: pathname, method }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, text: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('error', reject); request.end();
  });
}

test('health is independent of menu/database and unsupported write methods return 405', async (t) => {
  const app = await setup(t);
  const response = await fetch(app.origin + '/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', version: 'personal-v1' });
  assert.equal(app.calls(), 0);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  for (const method of ['POST', 'PATCH', 'DELETE', 'OPTIONS']) {
    const write = await fetch(app.origin + '/api/orders', { method });
    assert.equal(write.status, 405); assert.equal(write.headers.get('allow'), 'GET, HEAD');
    assert.match((await write.json()).error, /metóda/);
  }
  const unknown = await fetch(app.origin + '/api/orders');
  assert.equal(unknown.status, 404); assert.ok((await unknown.json()).error);
});

test('static files have correct MIME/cache/security headers and HTML routes use SPA fallback', async (t) => {
  const app = await setup(t);
  const html = await fetch(app.origin + '/moje-obedy');
  assert.equal(html.status, 200); assert.match(await html.text(), /Moje obedy/);
  assert.equal(html.headers.get('cache-control'), 'no-store');
  assert.equal(html.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(html.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(html.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(html.headers.get('content-security-policy'), /script-src 'self';/);
  assert.doesNotMatch(html.headers.get('content-security-policy'), /script-src[^;]*unsafe-inline/);
  assert.match(html.headers.get('content-security-policy'), /style-src 'self' 'unsafe-inline'/);
  const script = await fetch(app.origin + '/assets/app-abcdef12.js');
  assert.equal(script.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(script.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.match(await script.text(), /console\.log/);
  const missing = await fetch(app.origin + '/assets/missing.js');
  assert.equal(missing.status, 404); assert.ok((await missing.json()).error);
  const head = await fetch(app.origin + '/', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});

test('traversal, encoded backslash, malformed URLs and hidden files do not escape the static root', async (t) => {
  const app = await setup(t);
  for (const pathname of ['/../private.txt', '/%2e%2e/private.txt', '/assets/%2e%2e/%2e%2e/private.txt', '/..%5cprivate.txt', '/%00private', '/%zz', '//evil.example/private']) {
    const response = await rawRequest(app.origin, pathname);
    assert.ok([400, 403].includes(response.status), `${pathname}: ${response.status}`);
    assert.doesNotMatch(response.text, /must never leave/);
  }
  await fs.writeFile(path.join(app.publicRoot, '.env'), 'must never leave');
  const hidden = await fetch(app.origin + '/.env');
  assert.equal(hidden.status, 404);
});

test('symlinks cannot expose a file outside the static directory', async (t) => {
  const app = await setup(t);
  try { await fs.symlink(path.join(app.directory, 'private.txt'), path.join(app.publicRoot, 'leak.txt')); }
  catch (error) { if (error.code === 'EPERM' || error.code === 'EACCES') return t.skip('Creating symlinks is not permitted on this Windows account.'); throw error; }
  const response = await fetch(app.origin + '/leak.txt');
  assert.equal(response.status, 403); assert.doesNotMatch(await response.text(), /must never leave/);
});

test('menu endpoint preserves real published dates, A-D, gram amounts and only actual published price', async (t) => {
  const app = await setup(t, { now: () => Date.parse('2026-10-19T10:00:00Z') });
  const response = await fetch(app.origin + '/api/menu?url=http://private.invalid');
  assert.equal(response.status, 200);
  const menu = await response.json();
  assert.deepEqual(menu.days.map((day) => day.date), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  assert.equal(menu.days[0].soup.name, 'Paradajková s cestovinou');
  assert.deepEqual(menu.days[0].meals.map((meal) => meal.code), ['A', 'B', 'C', 'D']);
  assert.equal(menu.days[0].meals[0].name, 'Zeleninové rizoto s tuniakom');
  assert.equal(menu.days[0].meals[0].weight, '350g');
  assert.equal(menu.days[0].extra.price, '1.00 €');
  assert.equal(menu.days[0].meals[0].price, undefined);
  assert.equal(menu.fetchedAt, '2026-10-19T10:00:00.000Z'); assert.equal(menu.stale, false);
});

test('menu cache lasts fifteen minutes, coalesces concurrent refreshes and always uses fixed source', async (t) => {
  let time = Date.parse('2026-10-19T10:00:00Z'); let calls = 0; let release;
  let gate = null;
  const app = await setup(t, { now: () => time, fetchImpl: async (url, options) => {
    calls++; assert.equal(url, MENU_SOURCE); assert.equal(options.redirect, 'manual'); assert.ok(options.signal instanceof AbortSignal);
    if (gate) await gate;
    return htmlResponse(await fixturePromise);
  } });
  await (await fetch(app.origin + '/api/menu')).json();
  time += CACHE_MS - 1;
  await (await fetch(app.origin + '/api/menu')).json(); assert.equal(calls, 1);
  gate = new Promise((resolve) => { release = resolve; });
  const first = fetch(app.origin + '/api/menu?refresh=1');
  const second = fetch(app.origin + '/api/menu?refresh=1');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(calls, 2); release();
  const results = await Promise.all([first, second]);
  for (const response of results) assert.equal((await response.json()).stale, false);
  assert.equal(calls, 2);
  gate = null; time += CACHE_MS;
  await (await fetch(app.origin + '/api/menu')).json(); assert.equal(calls, 3);
});

test('upstream failure returns retained stale menu; a cold failure returns 503 without invented days', async (t) => {
  let failing = false;
  const app = await setup(t, { fetchImpl: async () => { if (failing) throw new Error('sensitive upstream details'); return htmlResponse(await fixturePromise); } });
  const original = await (await fetch(app.origin + '/api/menu')).json();
  failing = true;
  const staleResponse = await fetch(app.origin + '/api/menu?refresh=1');
  const stale = await staleResponse.json();
  assert.equal(staleResponse.status, 200); assert.equal(stale.stale, true);
  assert.equal(stale.fetchedAt, original.fetchedAt); assert.deepEqual(stale.days, original.days);
  assert.doesNotMatch(stale.error, /sensitive/);
  assert.equal((await (await fetch(app.origin + '/api/menu')).json()).stale, true, 'A failed refresh stays stale until a successful verification.');
  const cold = await setup(t, { fetchImpl: async () => { throw new Error('unavailable'); } });
  const coldResponse = await fetch(cold.origin + '/api/menu');
  const empty = await coldResponse.json();
  assert.equal(coldResponse.status, 503); assert.deepEqual(empty.days, []); assert.equal(empty.fetchedAt, null); assert.equal(empty.stale, true);
});

test('streaming menu limit rejects oversized bodies and cancels before reading further', async (t) => {
  let cancelled = false;
  const app = await setup(t, { fetchImpl: async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_HTML_BYTES + 1)); },
    cancel() { cancelled = true; },
  }), { headers: { 'content-type': 'text/html' } }) });
  const response = await fetch(app.origin + '/api/menu');
  assert.equal(response.status, 503); assert.equal((await response.json()).stale, true); assert.equal(cancelled, true);
});

test('upstream foreign redirects are rejected before contacting another host', async (t) => {
  let calls = 0;
  const app = await setup(t, { fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); } });
  const response = await fetch(app.origin + '/api/menu');
  assert.equal(response.status, 503); assert.equal((await response.json()).stale, true); assert.equal(calls, 1);
});

test('parser skips incomplete days and removes executable markup and invalid numeric entities safely', async () => {
  const fixture = await fixturePromise;
  const incomplete = fixture.replace(/<tr>\s*<td class="menu_caption">C<\/td>[\s\S]*?Domáce pečené buchty[\s\S]*?<\/tr>/, '');
  assert.equal(parseMenuHtml(incomplete).some((day) => day.date === '2026-10-19'), false);
  const safe = parseMenuHtml(fixture.replace('Zeleninové rizoto s tuniakom', 'A &amp; B &#99999999;<script>alert(1)</script><style>bad</style><img src=x onerror=alert(2)>'));
  assert.equal(safe[0].meals[0].name, 'A & B \ufffd');
  assert.doesNotMatch(safe[0].meals[0].name, /alert|script|img|bad/);
});
