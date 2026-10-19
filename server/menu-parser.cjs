/**
 * Parse the public Galaxia lunch-menu HTML without a DOM dependency.
 * Invalid/incomplete menu days are skipped deliberately (fail closed).
 */

const CODES = ['A', 'B', 'C', 'D'];

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  };
  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (whole, code) => {
      if (code[0] === '#') {
        const number = code[1].toLowerCase() === 'x'
          ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isInteger(number) && number >= 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
          ? String.fromCodePoint(number) : '\ufffd';
      }
      return named[code.toLowerCase()] ?? whole;
    });
}

function textContent(fragment) {
  return decodeEntities(fragment
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()).replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function cellValue(cell) {
  const weightMatch = cell.match(/(?:Gramáž|Gramaz)\s*:\s*([^<]+)/i);
  const weight = weightMatch ? textContent(weightMatch[1]) : '';
  const withoutWeight = cell.replace(/<span\b[^>]*class=["'][^"']*gramaz[^"']*["'][^>]*>[\s\S]*?<\/span\s*>/i, '');
  return { name: textContent(withoutWeight), weight };
}

function parseDay(block, date) {
  const header = block.match(/<div\b[^>]*class=["'][^"']*day-header[^"']*["'][^>]*>([\s\S]*?)<\/div\s*>/i);
  const label = header ? textContent(header[1]) : date;
  const rows = [...block.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)];
  const meals = new Map();
  let duplicateMeal = false;
  let soup;
  let extra;
  for (const match of rows) {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td\s*>/gi)].map((m) => m[1]);
    if (cells.length < 2) continue;
    const caption = textContent(cells[0]);
    const value = cellValue(cells[1]);
    if (/^polievka\b/i.test(caption)) soup = value;
    else if (/^obloha\b/i.test(caption)) {
      const price = textContent(cells[0]).match(/(\d+[,.]\d{2})\s*€/);
      extra = { ...value, ...(price ? { price: `${price[1].replace(',', '.')} €` } : {}) };
    } else {
      const code = caption.match(/^([ABCD])\b/i)?.[1]?.toUpperCase();
      if (code) {
        if (meals.has(code)) duplicateMeal = true;
        meals.set(code, { code, name: value.name.replace(/^FIT\s+/i, '').trim(), weight: value.weight });
      }
    }
  }
  if (!soup?.name || duplicateMeal || CODES.some((code) => !meals.get(code)?.name) || meals.size !== 4) return null;
  return { date, label, soup, meals: CODES.map((code) => meals.get(code)), ...(extra ? { extra } : {}) };
}

function parseMenuHtml(html) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  const safe = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
  const scopeMatch = safe.match(/<div\b[^>]*id=["']obedne-menu["'][^>]*>([\s\S]*)/i);
  const scope = scopeMatch ? scopeMatch[1] : '';
  const starts = [...scope.matchAll(/<div\b[^>]*class=["'][^"']*menu-day[^"']*["'][^>]*datum_obedneho_menu=["']([^"']+)["'][^>]*>/gi)];
  const days = [];
  starts.forEach((match, index) => {
    const date = match[1];
    if (!validDate(date)) return;
    const start = match.index + match[0].length;
    const end = index + 1 < starts.length ? starts[index + 1].index : scope.length;
    const day = parseDay(scope.slice(start, end), date);
    if (day) days.push(day);
  });
  days.sort((a, b) => a.date.localeCompare(b.date));
  // The public page keeps the previous and current work week together. Select
  // the newest complete Monday-Friday block; never shift or fabricate dates.
  const completeBlocks = days.filter((day) => {
    const start = new Date(`${day.date}T00:00:00Z`);
    return start.getUTCDay() === 1 && [1, 2, 3, 4].every((offset) =>
      days.some((candidate) => candidate.date === new Date(start.getTime() + offset * 86400000).toISOString().slice(0, 10)));
  });
  if (completeBlocks.length) {
    const monday = completeBlocks.at(-1).date;
    const start = new Date(`${monday}T00:00:00Z`);
    return days.filter((day) => {
      const delta = (new Date(`${day.date}T00:00:00Z`) - start) / 86400000;
      return delta >= 0 && delta <= 4;
    });
  }
  return days;
}

function menuDayFingerprint(day) {
  return JSON.stringify(day);
}


module.exports = { parseMenuHtml, menuDayFingerprint };
