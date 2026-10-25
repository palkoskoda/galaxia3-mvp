'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validateMenuDocument } = require('../server/published-menu.cjs');
const { assertPdf } = require('./validate-menus.cjs');

function importMenu(input, pdfInput) {
  const root = path.join(__dirname, '..');
  const document = validateMenuDocument(JSON.parse(fs.readFileSync(input, 'utf8')));
  const menusPath = path.join(root, 'data/menus');
  const pdfPath = path.join(root, 'frontend/public/menus', `${document.weekStart}.pdf`);
  assertPdf(pdfInput || pdfPath);
  const output = path.join(menusPath, `${document.weekStart}.json`);
  let previous = null;
  if (fs.existsSync(output)) previous = validateMenuDocument(JSON.parse(fs.readFileSync(output, 'utf8')));
  // A repeat run must not create a new deployment just to change importedAt.
  if (previous && JSON.stringify({...previous,importedAt:null}) === JSON.stringify({...document,importedAt:null})) {
    if (!pdfInput || (fs.existsSync(pdfPath) && fs.readFileSync(pdfPath).equals(fs.readFileSync(pdfInput)))) {
      console.log(`Unchanged: ${document.weekStart}`);return false;
    }
  }
  fs.mkdirSync(menusPath, { recursive: true });
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  if (pdfInput && path.resolve(pdfInput) !== path.resolve(pdfPath)) fs.copyFileSync(pdfInput, pdfPath);
  fs.writeFileSync(output + '.tmp', JSON.stringify(document, null, 2) + '\n', 'utf8');
  fs.renameSync(output + '.tmp', output);
  console.log(`Imported: ${document.weekStart}`);
  return true;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args[0] || (args.length !== 1 && !(args.length === 3 && args[1] === '--pdf'))) {
    console.error('Usage: npm run menu:import -- input.json [--pdf original.pdf]');process.exitCode = 1;
  } else {
    try { importMenu(args[0], args[2]); } catch (error) { console.error(error.message);process.exitCode = 1; }
  }
}
module.exports = { importMenu };
