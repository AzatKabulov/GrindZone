/** Local-date helpers. Dates are stored as 'YYYY-MM-DD' keys in the user's local time. */

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_LONG = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
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

/** 'TODAY' / 'TOMORROW' / 'YESTERDAY' / 'WED 26 NOV' */
export function relativeLabel(key: string, today = todayKey()): string {
  const diff = diffDays(today, key);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  if (diff === -1) return 'YESTERDAY';
  return `${weekdayShort(key)} ${dayNum(key)} ${monthShort(key)}`;
}

/** 'Today' / 'Tomorrow' / 'Wed 26 Nov' — for sentences rather than uppercase labels. */
export function niceLabel(key: string, today = todayKey()): string {
  return relativeLabel(key, today)
    .toLowerCase()
    .replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

/** Monday-based start of week. */
export function startOfWeek(key: string): string {
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7;
  return addDays(key, -dow);
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

/** 95 -> '1H 35M' */
export function fmtDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}H ${r}M`;
  if (h) return `${h}H`;
  return `${r}M`;
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
  if (h < 5) return 'BURNING THE MIDNIGHT OIL';
  if (h < 12) return 'GOOD MORNING';
  if (h < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}
