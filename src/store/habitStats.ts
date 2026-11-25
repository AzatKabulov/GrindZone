import { addDays, diffDays, isoToKey, startOfWeek } from '@/lib/date';
import type { Habit } from './data';
import { alive, habitBest, habitStreak } from './selectors';

/**
 * Habit analytics. A habit can be done once per day from the day it started (the day it was created,
 * or its first check if that's earlier). Rates = days done / days possible, never counting the future.
 * Today only counts once it's checked — the day isn't over, so an unchecked today isn't a miss yet.
 */

export interface Rate {
  done: number;
  possible: number;
  /** done / possible, or null when nothing was possible. */
  rate: number | null;
}

export interface WeekStat extends Rate {
  /** Monday of the week (YYYY-MM-DD). */
  start: string;
}

export interface HabitStat {
  habit: Habit;
  week: Rate;
  last4: Rate;
  prev4: Rate;
  streak: number;
  best: number;
}

const rate = (done: number, possible: number): Rate => ({ done, possible, rate: possible ? done / possible : null });

export function habitStart(h: Habit): string {
  const created = isoToKey(h.created_at) ?? '9999-12-31';
  const first = [...(h.checks ?? [])].sort()[0];
  return first && first < created ? first : created;
}

/** Days done / possible for one habit between from and to (inclusive), capped at today. */
export function habitRate(h: Habit, from: string, to: string, today: string): Rate {
  const start = habitStart(h);
  const doneToday = (h.checks ?? []).includes(today);
  const last = doneToday ? today : addDays(today, -1);
  const a = from > start ? from : start;
  const b = to < last ? to : last;
  if (a > b) return rate(0, 0);
  const possible = diffDays(a, b) + 1;
  let done = 0;
  for (const d of h.checks ?? []) if (d >= a && d <= b) done++;
  return rate(Math.min(done, possible), possible);
}

function sumRates(list: Rate[]): Rate {
  let done = 0;
  let possible = 0;
  for (const r of list) {
    done += r.done;
    possible += r.possible;
  }
  return rate(done, possible);
}

export function habitsStats(habitsById: Record<string, Habit>, today: string, weeks = 12) {
  const habits = alive(habitsById).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const monday = startOfWeek(today);

  const weekly: WeekStat[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(monday, -7 * i);
    const r = sumRates(habits.map((h) => habitRate(h, start, addDays(start, 6), today)));
    weekly.push({ start, ...r });
  }

  const thisWeek = weekly[weekly.length - 1];
  const lastWeek = weekly[weekly.length - 2];
  const last4 = sumRates(habits.map((h) => habitRate(h, addDays(monday, -21), today, today)));
  const prev4 = sumRates(habits.map((h) => habitRate(h, addDays(monday, -49), addDays(monday, -22), today)));

  // Monday … Sunday over the whole window
  const from = addDays(monday, -7 * (weeks - 1));
  const weekdays: Rate[] = Array.from({ length: 7 }, () => rate(0, 0));
  for (const h of habits) {
    const checks = new Set(h.checks ?? []);
    const start = habitStart(h);
    const last = checks.has(today) ? today : addDays(today, -1);
    for (let d = from > start ? from : start; d <= last; d = addDays(d, 1)) {
      const i = diffDays(startOfWeek(d), d);
      const w = weekdays[i];
      w.possible++;
      if (checks.has(d)) w.done++;
    }
  }
  for (const w of weekdays) w.rate = w.possible ? w.done / w.possible : null;

  const perHabit: HabitStat[] = habits.map((h) => ({
    habit: h,
    week: habitRate(h, monday, addDays(monday, 6), today),
    last4: habitRate(h, addDays(monday, -21), today, today),
    prev4: habitRate(h, addDays(monday, -49), addDays(monday, -22), today),
    streak: habitStreak(h, today),
    best: habitBest(h),
  }));

  return { habits, weekly, thisWeek, lastWeek, last4, prev4, weekdays, perHabit };
}

/** Change in percentage points between two rates (null if either is missing). */
export function deltaPts(now: Rate | undefined, before: Rate | undefined): number | null {
  if (!now || !before || now.rate === null || before.rate === null) return null;
  return Math.round((now.rate - before.rate) * 100);
}
