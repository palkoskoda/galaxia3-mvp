const addDays = (date, count) => new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export function preferredWeek(days, today) {
  const current = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const next = addDays(current, 7);
  if (days.some(day => day.date >= next && day.date <= addDays(next, 4))) return next;
  if (today <= addDays(current, 4) && days.some(day => day.date >= current && day.date <= addDays(current, 4))) return current;
  // An old menu must not look like the menu for the coming work week.
  return next;
}
