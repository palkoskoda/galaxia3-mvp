'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DAY_NAMES = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const TEXT_LIMIT = 400;

function text(value, field) {
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  const result = value.replace(/\s+/g, ' ').trim();
  if (!result || result.length > TEXT_LIMIT) throw new Error(`Invalid ${field}`);
  return result;
}

function optionalText(value, field) {
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  const result = value.replace(/\s+/g, ' ').trim();
  if (result.length > TEXT_LIMIT) throw new Error(`Invalid ${field}`);
  return result;
}

function date(value, field) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) throw new Error(`Invalid ${field}`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Invalid ${field}`);
  return value;
}

function iso(value, field) {
  if (typeof value !== 'string' || !ISO_RE.test(value)) throw new Error(`Invalid ${field}`);
  date(value.slice(0, 10), `${field}.date`);
  const offset = value.match(/([+-])(\d{2}):(\d{2})$/);
  if (offset && (Number(offset[2]) > 23 || Number(offset[3]) > 59)) throw new Error(`Invalid ${field}`);
  if (Number.isNaN(Date.parse(value))) throw new Error(`Invalid ${field}`);
  return new Date(value).toISOString();
}

function addDays(start, offset) {
  const result = new Date(`${start}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

function validateMenuDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1) throw new Error('Invalid menu document');
  const weekStart = date(value.weekStart, 'weekStart');
  if (new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 1) throw new Error('weekStart must be Monday');
  const source = value.source;
  if (!source || typeof source !== 'object' || Array.isArray(source) || source.kind !== 'email-pdf') throw new Error('Invalid source');
  const normalizedSource = {
    kind: 'email-pdf', label: text(source.label, 'source.label'), receivedAt: iso(source.receivedAt, 'source.receivedAt'),
  };
  const importedAt = iso(value.importedAt, 'importedAt');
  if (!Array.isArray(value.days) || value.days.length !== 5) throw new Error('Menu must contain five days');
  const days = value.days.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid menu day');
    const expectedDate = addDays(weekStart, index);
    if (date(raw.date, `days[${index}].date`) !== expectedDate) throw new Error('Days are not consecutive');
    const soup = raw.soup;
    if (!soup || typeof soup !== 'object') throw new Error('Invalid soup');
    const meals = raw.meals;
    if (!Array.isArray(meals) || meals.length !== 4) throw new Error('Menu must contain A-D meals');
    const normalizedMeals = meals.map((meal, mealIndex) => {
      if (!meal || typeof meal !== 'object' || meal.code !== String.fromCharCode(65 + mealIndex)) throw new Error('Meals must be ordered A-D');
      return { code: meal.code, name: text(meal.name, 'meal.name'), weight: optionalText(meal.weight, 'meal.weight') };
    });
    const normalized = { date: expectedDate, label: text(raw.label, 'day.label'), soup: { name: text(soup.name, 'soup.name'), weight: optionalText(soup.weight, 'soup.weight') }, meals: normalizedMeals };
    if (raw.extra !== undefined && raw.extra !== null) {
      if (!raw.extra || typeof raw.extra !== 'object') throw new Error('Invalid extra');
      normalized.extra = { name: text(raw.extra.name, 'extra.name'), weight: optionalText(raw.extra.weight, 'extra.weight') };
      if (raw.extra.price !== undefined) normalized.extra.price = text(raw.extra.price, 'extra.price');
    }
    return normalized;
  });
  return { schemaVersion: 1, weekStart, importedAt, source: normalizedSource, days };
}

function readPublishedMenus(directory) {
  if (!directory) return [];
  const resolved = path.resolve(directory);
  let entries;
  try { entries = fs.readdirSync(resolved, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return entries.filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name)).map((entry) => {
    const weekStart = entry.name.slice(0, -5);
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(path.join(resolved, entry.name), 'utf8')); }
    catch (error) { throw new Error(`Invalid published menu ${entry.name}: ${error.message}`); }
    if (parsed?.weekStart !== weekStart) throw new Error(`Published menu filename does not match weekStart: ${entry.name}`);
    try { return validateMenuDocument(parsed); }
    catch (error) { throw new Error(`Invalid published menu ${entry.name}: ${error.message}`); }
  });
}

function weekOf(dateValue) {
  const parsed = new Date(`${dateValue}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7));
  return parsed.toISOString().slice(0, 10);
}

function combineMenus(webMenu = {}, publishedDocuments = []) {
  const webDays = Array.isArray(webMenu.days) ? webMenu.days : [];
  const byDate = new Map(webDays.filter((day) => day && typeof day.date === 'string').map((day) => [day.date, day]));
  for (const document of publishedDocuments) for (const day of document.days) byDate.set(day.date, day);
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const webWeeks = new Map();
  for (const day of webDays) { const week = weekOf(day.date); if (!webWeeks.has(week)) webWeeks.set(week, { stale: Boolean(webMenu.stale) }); }
  const weekSources = [...webWeeks.entries()].map(([weekStart, info]) => ({ weekStart, kind: 'website', label: 'Web Galaxie', stale: info.stale }));
  for (const document of publishedDocuments) weekSources.push({ weekStart: document.weekStart, kind: 'email-pdf', label: document.source.label, stale: false, importedAt: document.importedAt, receivedAt: document.source.receivedAt, pdfUrl: `/menus/${document.weekStart}.pdf` });
  const curatedWeekSet = new Set(publishedDocuments.map((document) => document.weekStart));
  for (let index = weekSources.length - 1; index >= 0; index -= 1) {
    if (weekSources[index].kind === 'website' && curatedWeekSet.has(weekSources[index].weekStart)) weekSources.splice(index, 1);
  }
  if (!webDays.length && !publishedDocuments.length && webMenu.stale) weekSources.push({ weekStart: null, kind: 'website', label: 'Web Galaxia', stale: true });
  weekSources.sort((a, b) => String(a.weekStart).localeCompare(String(b.weekStart)));
  const latestImport = publishedDocuments.map((document) => document.importedAt).sort().at(-1) || null;
  return { days, fetchedAt: webMenu.fetchedAt || latestImport, stale: weekSources.some((source) => source.stale), ...(webMenu.error ? { error: webMenu.error } : {}), weekSources };
}

module.exports = { validateMenuDocument, readPublishedMenus, combineMenus };
