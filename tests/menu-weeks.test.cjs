const { test } = require('node:test');
const assert = require('node:assert/strict');
test('planning opens published next week, uses current working week, and never falls back to expired menu', async () => {
  const { preferredWeek } = await import('../frontend/src/personal/menu-weeks.mjs');
  const old = [{date:'2026-10-23'}];
  const upcoming = [...old, {date:'2026-10-26'}];
  assert.equal(preferredWeek(upcoming, '2026-10-25'), '2026-10-26');
  assert.equal(preferredWeek(old, '2026-10-25'), '2026-10-26');
  assert.equal(preferredWeek(old, '2026-10-21'), '2026-10-19');
  assert.equal(preferredWeek([], '2026-10-25'), '2026-10-26');
  assert.equal(preferredWeek([{date:'2026-11-02'}], '2026-10-28'), '2026-11-02');
});
