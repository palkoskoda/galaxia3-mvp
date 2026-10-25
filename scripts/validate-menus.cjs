'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readPublishedMenus } = require('../server/published-menu.cjs');
const root = path.join(__dirname, '..');
function assertPdf(filename) {
  const stat = fs.statSync(filename);
  if (!stat.isFile() || stat.size < 5 || stat.size > 2_000_000) throw new Error('PDF must be a file smaller than 2 MB.');
  if (fs.readFileSync(filename).subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF header.');
}
function validatePublishedMenus() {
  const documents = readPublishedMenus(path.join(root, 'data/menus'));
  for (const document of documents) {
    assertPdf(path.join(root, 'frontend/public/menus', `${document.weekStart}.pdf`));
    console.log(`${document.weekStart}: 5 days, 20 meals, source PDF present.`);
  }
  return documents;
}
if (require.main === module) {
  try { validatePublishedMenus(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { assertPdf, validatePublishedMenus };
