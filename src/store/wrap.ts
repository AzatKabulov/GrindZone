import type { BlockCategory } from '@/lib/categories';
import { addDays, isoToKey } from '@/lib/date';
import type { Block, Goal, Habit, Note, Task } from './data';
import { habitRate } from './habitStats';
import { activeDays, activityByDay, alive, currentStreak, taskDays } from './selectors';

/**
 * Weekly Wrap: everything about one Monday–Sunday week, plus the same numbers for the week before
 * so every stat can be compared. Days after today never count.
 */

export interface WeekNumbers {
  start: string;
  /** Last day that counts (Sunday, or today for the current week). */
  end: string;
  days: string[];
  tasksDone: number;
  tasksTotal: number;
  /** done / total over the week's days (null if there were no tasks). */
  completion: number | null;
  /** Tasks finished per day, Monday first. */
  perDay: number[];
  habitDone: number;
  habitPossible: number;
  habitRate: number | null;
  habits: { id: string; title: string; emoji: string; done: number; possible: number }[];
  focusSessions: number;
  focusPerDay: number[];
  plannedMin: number;
  plannedByCat: { cat: BlockCategory; min: number }[];
  stepsDone: number;
  goalsAchieved: string[];
  activeDays: number;
  /** Morning / afternoon / evening / night: when tasks got finished. */
  timeOfDay: [number, number, number, number];
  bestDay: { index: number; count: number } | null;
  /** 0–100, see weekScore. */
  score: number;
}

export interface Wrap {
  week: WeekNumbers;
  /** The week before — for a week still in progress, only the same days (Mon…same weekday). */
  prev: WeekNumbers;
  isCurrent: boolean;
  /** How to name `prev` in comparisons. */
  prevLabel: string;
  streak: number;
}

interface Sources {
  tasks: Record<string, Task>;
  habits: Record<string, Habit>;
  blocks: Record<string, Block>;
  goals: Record<string, Goal>;
  notes: Record<string, Note>;
  focus: Record<string, number>;
}

/** A single number for the week: task completion 35%, habits 35%, active days 20%, focus 10%. */
export function weekScore(w: Omit<WeekNumbers, 'score'>): number {
  const n = w.days.length || 1;
  const parts: [number | null, number][] = [
    [w.completion, 0.35],
    [w.habitRate, 0.35],
    [w.activeDays / n, 0.2],
    [Math.min(1, w.focusSessions / (n * 1.5)), 0.1],
  ];
  let sum = 0;
  let weight = 0;
  for (const [v, k] of parts) {
    if (v === null) continue;
    sum += v * k;
    weight += k;
  }
  return weight ? Math.round((sum / weight) * 100) : 0;
}

export function scoreTitle(score: number): { title: string; line: string } {
  if (score >= 90) return { title: 'UNSTOPPABLE', line: 'Elite week. This is who you are now.' };
  if (score >= 75) return { title: 'LOCKED IN', line: 'Serious consistency. Keep the standard.' };
  if (score >= 55) return { title: 'BUILDING', line: 'Solid base. Tighten one thing next week.' };
  if (score >= 35) return { title: 'WARMING UP', line: 'The engine is on. Now give it fuel.' };
  return { title: 'RESET WEEK', line: 'Every comeback starts with one day. Start Monday.' };
}

function numbers(src: Sources, start: string, today: string, maxDays = 7): WeekNumbers {
  const sunday = addDays(start, Math.min(6, maxDays - 1));
  const end = sunday < today ? sunday : today;
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const inWeek = (k: string | null | undefined) => !!k && k >= start && k <= end;

  // Tasks
  const byDay = taskDays(src.tasks, today);
  let tasksDone = 0;
  let tasksTotal = 0;
  const perDay = Array(7).fill(0);
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    if (d > end) break;
    const t = byDay[d];
    if (!t) continue;
    perDay[i] = t.done.length;
    tasksDone += t.done.length;
    tasksTotal += t.done.length + t.missed.length;
  }
  let best: WeekNumbers['bestDay'] = null;
  perDay.forEach((n, i) => {
    if (n > 0 && (!best || n > best.count)) best = { index: i, count: n };
  });

  const timeOfDay: [number, number, number, number] = [0, 0, 0, 0];
  for (const t of alive(src.tasks)) {
    if (!t.done || !t.done_at || !inWeek(isoToKey(t.done_at))) continue;
    const h = new Date(t.done_at).getHours();
    timeOfDay[h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3]++;
  }

  // Habits
  const habitList = alive(src.habits).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const habits = habitList.map((h) => {
    const r = habitRate(h, start, end, today);
    return { id: h.id, title: h.title || 'Untitled habit', emoji: h.emoji, done: r.done, possible: r.possible };
  });
  const habitDone = habits.reduce((a, h) => a + h.done, 0);
  const habitPossible = habits.reduce((a, h) => a + h.possible, 0);

  // Focus
  const focusPerDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return d <= end ? (src.focus[d] ?? 0) : 0;
  });

  // Plan
  const cat: Partial<Record<BlockCategory, number>> = {};
  let plannedMin = 0;
  for (const b of alive(src.blocks)) {
    if (!inWeek(b.date)) continue;
    const m = Math.max(0, b.end_min - b.start_min);
    plannedMin += m;
    cat[b.category] = (cat[b.category] ?? 0) + m;
  }
  const plannedByCat = (Object.entries(cat) as [BlockCategory, number][])
    .map(([c, min]) => ({ cat: c, min }))
    .sort((a, b) => b.min - a.min);

  // Goals
  let stepsDone = 0;
  const goalsAchieved: string[] = [];
  for (const g of alive(src.goals)) {
    for (const st of g.steps ?? []) if (st.done && inWeek(isoToKey(st.done_at))) stepsDone++;
    if (g.status === 'achieved' && inWeek(isoToKey(g.achieved_at))) goalsAchieved.push(g.title || 'Untitled goal');
  }

  // Active days: you did something that day
  const activity = activityByDay({ tasks: src.tasks, blocks: src.blocks, notes: src.notes, habits: src.habits, goals: src.goals, focus: src.focus });
  const active = days.filter((d) => (activity[d] ?? 0) > 0).length;

  const base = {
    start,
    end,
    days,
    tasksDone,
    tasksTotal,
    completion: tasksTotal ? tasksDone / tasksTotal : null,
    perDay,
    habitDone,
    habitPossible,
    habitRate: habitPossible ? habitDone / habitPossible : null,
    habits,
    focusSessions: focusPerDay.reduce((a, b) => a + b, 0),
    focusPerDay,
    plannedMin,
    plannedByCat,
    stepsDone,
    goalsAchieved,
    activeDays: active,
    timeOfDay,
    bestDay: best,
  };
  return { ...base, score: weekScore(base) };
}

export function weeklyWrap(src: Sources, weekStart: string, today: string): Wrap {
  const week = numbers(src, weekStart, today);
  const isCurrent = today >= weekStart && today <= addDays(weekStart, 6);
  // A week in progress is compared with the same days of the week before, so it's a fair fight.
  const prev = numbers(src, addDays(weekStart, -7), today, isCurrent ? week.days.length : 7);
  const streak = currentStreak(activeDays(src.tasks, src.goals, src.habits, src.focus), today);
  return { week, prev, isCurrent, prevLabel: isCurrent && week.days.length < 7 ? 'same days last week' : 'the week before', streak };
}

/** Relative change between two counts, as a whole percent (null when there's nothing to compare). */
export function changePct(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}
