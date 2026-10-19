export const MEAL_CODES = ['A', 'B', 'C', 'D'];
export const LOCKED_STATUSES = ['sending', 'sent', 'uncertain'];
const ZONE = 'Europe/Bratislava';
const DAYS = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];

export class OrderError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'OrderError'; this.status = status; }
}

export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(date, count) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + count);
  return parsed.toISOString().slice(0, 10);
}

export function validateWeek(weekStart) {
  if (!isIsoDate(weekStart) || new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 1) {
    throw new OrderError('Začiatok týždňa musí byť platný pondelok.');
  }
}

export function validateSelections(weekStart, selections, requireMeals = false) {
  validateWeek(weekStart);
  let count = 0;
  for (const [date, meals] of Object.entries(selections)) {
    if (!isIsoDate(date) || date < weekStart || date > addDays(weekStart, 4)) {
      throw new OrderError('Jedlá musia patriť do vybraného pracovného týždňa.');
    }
    for (const [code, quantity] of Object.entries(meals)) {
      if (!MEAL_CODES.includes(code) || !Number.isInteger(quantity) || quantity < 0 || quantity > 20) {
        throw new OrderError('Počet porcií musí byť celé číslo od 0 do 20.');
      }
      count += quantity;
    }
  }
  if (count > 100) throw new OrderError('Jedna objednávka môže obsahovať najviac 100 porcií.');
  if (requireMeals && count === 0) throw new OrderError('Najskôr vyberte aspoň jeden obed.');
  return count;
}

function partsAt(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
}

/** Resolve local delivery cutoffs, including winter/summer offsets. */
export function bratislavaInstant(date, hour, minute) {
  if (!isIsoDate(date)) throw new OrderError('Neplatný dátum.');
  const [year, month, day] = date.split('-').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = wall;
  for (let i = 0; i < 3; i++) {
    const p = partsAt(new Date(instant));
    const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    instant += wall - represented;
  }
  return new Date(instant);
}

export function mealDeadline(date, code) {
  if (!MEAL_CODES.includes(code)) throw new OrderError('Neplatné označenie jedla.');
  return code === 'D' ? bratislavaInstant(date, 8, 0) : bratislavaInstant(addDays(date, -1), 14, 30);
}

export function normalizeSendAt(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new OrderError('Neplatný čas odoslania.');
  const local = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::00)?$/);
  if (local) {
    const [, date, rawHour, rawMinute] = local;
    const hour = Number(rawHour); const minute = Number(rawMinute);
    if (!isIsoDate(date) || hour > 23 || minute > 59) throw new OrderError('Neplatný čas odoslania.');
    const candidate = bratislavaInstant(date, hour, minute);
    const matches = (instant) => {
      const p = partsAt(instant);
      return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` === date && p.hour === hour && p.minute === minute;
    };
    if (!matches(candidate) || matches(new Date(candidate.getTime() - 3_600_000)) || matches(new Date(candidate.getTime() + 3_600_000))) {
      throw new OrderError('Tento miestny čas je pri zmene letného času nejednoznačný alebo neexistuje. Vyberte iný čas.');
    }
    return candidate.toISOString();
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new OrderError('Neplatný čas odoslania.');
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || !isIsoDate(value.slice(0, 10))) throw new OrderError('Neplatný čas odoslania.');
  return instant.toISOString();
}

export function selectedMeals(order) {
  return Object.entries(order.selections).sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, meals]) => MEAL_CODES.filter((code) => meals[code] > 0)
      .map((code) => ({ date, code, quantity: meals[code] })));
}

export function validateForDelivery(order, menuDays, now = new Date(), scheduled = false) {
  validateSelections(order.weekStart, order.selections, true);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new OrderError('Neplatný čas.');
  const sendAt = order.sendAt ? new Date(order.sendAt) : null;
  if (order.sendAt && (!sendAt || !Number.isFinite(sendAt.getTime()))) throw new OrderError('Neplatný čas odoslania.');
  if (scheduled && sendAt && sendAt <= now) throw new OrderError('Čas automatického odoslania musí byť v budúcnosti.');
  const snapshot = [];
  for (const selected of selectedMeals(order)) {
    const day = menuDays.find((item) => item.date === selected.date);
    const meal = day?.meals.find((item) => item.code === selected.code);
    if (!meal?.name) throw new OrderError(`Menu na ${formatDate(selected.date)} ešte nie je zverejnené.`, 409);
    const deadline = mealDeadline(selected.date, selected.code);
    if (now >= deadline) throw new OrderError(`Termín objednania jedla ${selected.code} na ${formatDate(selected.date)} už uplynul.`, 409);
    if (scheduled && sendAt && sendAt >= deadline) {
      throw new OrderError(`Čas odoslania je príliš neskoro pre jedlo ${selected.code} na ${formatDate(selected.date)}.`);
    }
    snapshot.push({ date: selected.date, code: selected.code, name: meal.name, weight: meal.weight ?? '' });
  }
  return JSON.stringify(snapshot);
}

export function formatDate(date) {
  const [year, month, day] = date.split('-');
  return `${Number(day)}.${Number(month)}.${year}`;
}

export function formatOrderEmail(order, origin) {
  const grouped = new Map();
  for (const meal of selectedMeals(order)) {
    grouped.set(meal.date, [...(grouped.get(meal.date) ?? []), `${meal.quantity}x${meal.code}`]);
  }
  const lines = [...grouped].map(([date, choices]) => `${DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]} ${formatDate(date)} : ${choices.join(', ')}`);
  const body = ['Dobrý deň,', '', `poprosím vás o donášku obedov na adresu ${order.profile.address}.`, '', ...lines];
  if (order.note.trim()) body.push('', `Poznámka: ${order.note.trim()}`);
  body.push('', 'Ďakujem.', '', 'S pozdravom', order.profile.name, `Kontakt: ${order.profile.email}`, '', `Pripravené cez Moje obedy · ${origin}`);
  return { subject: `Objednávka obedov ${formatDate(order.weekStart)} – ${formatDate(addDays(order.weekStart, 4))} · ${order.profile.name}`, text: body.join('\n') };
}

export function constantTimeEqual(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  let difference = first.length ^ second.length;
  const length = Math.max(first.length, second.length);
  for (let i = 0; i < length; i++) difference |= (first.charCodeAt(i) || 0) ^ (second.charCodeAt(i) || 0);
  return difference === 0;
}
