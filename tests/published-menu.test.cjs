'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { validateMenuDocument, readPublishedMenus, combineMenus } = require('../server/published-menu.cjs');
const { createHandler } = require('../server/app.cjs');

function documentFor(weekStart, label = 'Email Galaxia') {
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(`${weekStart}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + index);
    const value = date.toISOString().slice(0, 10);
    return { date: value, label: `Deň ${index + 1}`, soup: { name: 'Polievka', weight: '0,33l' }, meals: ['A', 'B', 'C', 'D'].map((code) => ({ code, name: `${label} ${code}`, weight: '350g' })) };
  });
  return { schemaVersion: 1, weekStart, importedAt: '2026-10-21T12:00:00Z', source: { kind: 'email-pdf', label, receivedAt: '2026-10-21T11:00:00Z' }, days };
}

test('published documents are strictly validated and normalized', () => {
  const result = validateMenuDocument(documentFor('2026-10-26'));
  assert.equal(result.days.length, 5);
  assert.equal(result.days[0].meals[0].name, 'Email Galaxia A');
  assert.throws(() => validateMenuDocument({ ...documentFor('2026-10-27'), weekStart: '2026-10-27' }), /Monday|weekStart/);
  const duplicate = documentFor('2026-10-26'); duplicate.days[1].date = duplicate.days[0].date;
  assert.throws(() => validateMenuDocument(duplicate));
  const missing = documentFor('2026-10-26'); missing.days[0].meals = missing.days[0].meals.slice(0, 3);
  assert.throws(() => validateMenuDocument(missing));
});

test('PDF imports allow missing weights and normalize Gmail offsets, but reject invalid dates', () => {
  const document = documentFor('2026-10-26');
  document.importedAt = '2026-10-21T16:52:00+02:00';
  document.source.receivedAt = '2026-10-21T16:52:00+02:00';
  document.days[0].soup.weight = '';
  document.days[0].meals[0].weight = '';
  const normalized = validateMenuDocument(document);
  assert.equal(normalized.importedAt, '2026-10-21T14:52:00.000Z');
  assert.equal(normalized.source.receivedAt, '2026-10-21T14:52:00.000Z');
  assert.equal(normalized.days[0].soup.weight, '');
  assert.equal(normalized.days[0].meals[0].weight, '');
  const invalid = documentFor('2026-10-26');
  invalid.source.receivedAt = '2026-02-31T12:00:00+01:00';
  assert.throws(() => validateMenuDocument(invalid), /receivedAt/);
});

test('readPublishedMenus loads only matching JSON files and rejects malformed imports', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galaxia-published-test-'));
  try {
    fs.writeFileSync(path.join(directory, '2026-10-26.json'), JSON.stringify(documentFor('2026-10-26')));
    fs.writeFileSync(path.join(directory, 'notes.txt'), 'ignored');
    assert.equal(readPublishedMenus(directory).length, 1);
    fs.writeFileSync(path.join(directory, '2026-11-02.json'), JSON.stringify(documentFor('2026-10-26')));
    assert.throws(() => readPublishedMenus(directory), /filename does not match/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('curated email menu wins for the same week while other web weeks remain', () => {
  const curated = documentFor('2026-10-26', 'PDF');
  const web = { days: [
    { date: '2026-10-26', label: 'Web pondelok', soup: { name: 'Web soup', weight: '0,33l' }, meals: ['A', 'B', 'C', 'D'].map((code) => ({ code, name: `Web ${code}`, weight: '350g' })) },
    { date: '2026-11-02', label: 'Web ďalší týždeň', soup: { name: 'Web soup', weight: '0,33l' }, meals: ['A', 'B', 'C', 'D'].map((code) => ({ code, name: `Web ${code}`, weight: '350g' })) },
  ], fetchedAt: '2026-10-25T08:00:00Z', stale: false };
  const combined = combineMenus(web, [curated]);
  assert.equal(combined.days.length, 6);
  assert.equal(combined.days[0].meals[0].name, 'PDF A');
  assert.deepEqual(combined.days.map((day) => day.date), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-11-02']);
  assert.equal(combined.weekSources.find((source) => source.weekStart === '2026-10-26').kind, 'email-pdf');
  assert.equal(combined.weekSources.find((source) => source.weekStart === '2026-11-02').kind, 'website');
});

test('fresh published PDF serves when website is unavailable', () => {
  const combined = combineMenus({ days: [], fetchedAt: null, stale: true, error: 'web unavailable' }, [documentFor('2026-10-26')]);
  assert.equal(combined.days.length, 5);
  assert.equal(combined.stale, false);
  assert.equal(combined.fetchedAt, '2026-10-21T12:00:00Z');
  assert.equal(combined.error, 'web unavailable');
  assert.equal(combined.weekSources[0].pdfUrl, '/menus/2026-10-26.pdf');
});

test('HTTP menu endpoint serves a published PDF when web fetch is unavailable', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galaxia-published-http-'));
  const publicRoot = path.join(directory, 'public');
  const publishedRoot = path.join(directory, 'menus');
  fs.mkdirSync(publicRoot); fs.mkdirSync(publishedRoot);
  fs.writeFileSync(path.join(publicRoot, 'index.html'), '<!doctype html>');
  fs.writeFileSync(path.join(publishedRoot, '2026-10-26.json'), JSON.stringify(documentFor('2026-10-26')));
  const server = http.createServer(createHandler({ staticPath: publicRoot, publishedMenuPath: publishedRoot, fetchImpl: async () => { throw new Error('offline'); } }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/menu`);
    const menu = await response.json();
    assert.equal(response.status, 200);
    assert.equal(menu.days.length, 5);
    assert.equal(menu.stale, false);
    assert.equal(menu.weekSources[0].kind, 'email-pdf');
  } finally {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
