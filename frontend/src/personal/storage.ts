export type Code = 'A' | 'B' | 'C' | 'D';
export type Profile = { name: string; address: string; email: string };
export type Draft = { weekStart: string; profile: Profile; selections: Record<string, Partial<Record<Code, number>>>; note: string; sendAt: null };
export type LocalOrder = Draft & { id: string; status: 'draft'; revision: number; sentAt: null; lastError: null };
export type SavedState = { version: 1; profile: Profile; orders: LocalOrder[] };
export const STORAGE_KEY = 'galaxia:moje-obedy:v1';
export const blankProfile: Profile = { name: '', address: '', email: '' };

export function emptyState(): SavedState { return { version: 1, profile: { ...blankProfile }, orders: [] }; }
function profile(value: unknown): Profile {
  if (!value || typeof value !== 'object') return { ...blankProfile };
  const item = value as Record<string, unknown>;
  return { name: typeof item.name === 'string' ? item.name.slice(0, 120) : '', address: typeof item.address === 'string' ? item.address.slice(0, 300) : '', email: typeof item.email === 'string' ? item.email.slice(0, 254) : '' };
}
export function decodeState(raw: string | null): SavedState {
  if (!raw) return emptyState();
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('Neplatný uložený výber.');
  const value = parsed as Record<string, unknown>;
  if (value.version !== 1 || !Array.isArray(value.orders)) throw new Error('Neznámy formát uloženého výberu.');
  const orders: LocalOrder[] = [];
  for (const rawOrder of value.orders.slice(0, 52)) {
    if (!rawOrder || typeof rawOrder !== 'object') continue;
    const item = rawOrder as Record<string, unknown>;
    if (typeof item.weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.weekStart)) continue;
    const date = new Date(item.weekStart + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item.weekStart || date.getUTCDay() !== 1) continue;
    const selections: Draft['selections'] = {};
    if (item.selections && typeof item.selections === 'object') {
      for (const [day, rawMeals] of Object.entries(item.selections)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < item.weekStart || !rawMeals || typeof rawMeals !== 'object') continue;
        const dayDate = new Date(day + 'T12:00:00Z');
        const delta = (dayDate.getTime() - date.getTime()) / 86400000;
        if (!Number.isFinite(delta) || delta < 0 || delta > 4 || dayDate.toISOString().slice(0, 10) !== day) continue;
        selections[day] = {};
        for (const code of ['A', 'B', 'C', 'D'] as const) {
          const count = (rawMeals as Record<string, unknown>)[code];
          if (typeof count === 'number' && Number.isInteger(count) && count >= 0 && count <= 20) selections[day][code] = count;
        }
      }
    }
    orders.push({ weekStart: item.weekStart, profile: profile(item.profile), selections, note: typeof item.note === 'string' ? item.note.slice(0, 1000) : '', sendAt: null, id: item.weekStart, status: 'draft', revision: 1, sentAt: null, lastError: null });
  }
  return { version: 1, profile: profile(value.profile), orders };
}
export function readState(storage: Pick<Storage, 'getItem'>): SavedState { return decodeState(storage.getItem(STORAGE_KEY)); }
export function storeDraft(storage: Pick<Storage, 'getItem' | 'setItem'>, draft: Draft): LocalOrder {
  // Re-read before writing so switching weeks does not overwrite another saved week.
  const state = readState(storage);
  const previous = state.orders.find(item => item.weekStart === draft.weekStart);
  const order: LocalOrder = { ...draft, id: draft.weekStart, status: 'draft', revision: (previous?.revision ?? 0) + 1, sentAt: null, lastError: null };
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profile: draft.profile, orders: [order, ...state.orders.filter(item => item.weekStart !== draft.weekStart)].slice(0, 52) }));
  return order;
}
