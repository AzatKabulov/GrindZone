/** Local-date helpers. Dates are stored as 'YYYY-MM-DD' keys in the user's local time. */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

export function isoToKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return dateKey(new Date(iso));
}

export function weekday(key: string): string {
  return WEEKDAYS[parseKey(key).getDay()];
}

export function weekdayShort(key: string): string {
  return weekday(key).slice(0, 3);
}

export function monthShort(key: string): string {
  return MONTHS[parseKey(key).getMonth()];
}

export function monthLong(d: Date): string {
  return MONTHS_LONG[d.getMonth()];
}

export function dayNum(key: string): number {
  return parseKey(key).getDate();
}

/** 'Today' / 'Tomorrow' / 'Yesterday' / 'Wed, 26 Nov' */
export function relativeLabel(key: string, today = todayKey()): string {
  const diff = diffDays(today, key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${weekdayShort(key)}, ${dayNum(key)} ${monthShort(key)}`;
}

/** 'Wednesday, 25 November' */
export function longDate(key: string): string {
  const d = parseKey(key);
  return `${weekday(key)}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/** '25 Nov 2026' */
export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Monday-based start of week. */
export function startOfWeek(key: string): string {
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7;
  return addDays(key, -dow);
}

export function minToDate(day: string, min: number): Date {
  const d = parseKey(day);
  d.setMinutes(min);
  return d;
}

export function dateToMin(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** 450 -> '07:30' */
export function fmtMin(min: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(min)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** 95 -> '1 hr 35 min' */
export function fmtDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h} hr ${r} min`;
  if (h) return `${h} hr`;
  return `${r} min`;
}

/** 95 -> '1h 35m' (compact) */
export function fmtDurationShort(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h}h`;
  return `${r}m`;
}

export function fmtClock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}
