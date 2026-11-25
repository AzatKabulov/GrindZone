import { addDays, isoToKey } from '@/lib/date';
import type { Block, Goal, Habit, Note, Task } from './data';

export function alive<T extends { deleted: boolean }>(map: Record<string, T>): T[] {
  return Object.values(map).filter((r) => !r.deleted);
}

/** Your own order (drag to change it); new tasks go to the bottom. */
export function sortTasks(a: Task, b: Task): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/** Earliest due date first, then your own order within each day. */
export function sortTasksByDue(a: Task, b: Task): number {
  const ad = a.due_date ?? '9999';
  const bd = b.due_date ?? '9999';
  if (ad !== bd) return ad < bd ? -1 : 1;
  return sortTasks(a, b);
}

const byDoneDesc = (a: Task, b: Task) => ((a.done_at ?? '') < (b.done_at ?? '') ? 1 : -1);

/** Tasks for a given day: open ones due that day or earlier (overdue), plus ones completed that day. */
export function tasksForDay(tasks: Record<string, Task>, day: string) {
  const list = alive(tasks);
  const open = list.filter((t) => !t.done && t.due_date && t.due_date <= day).sort(sortTasks);
  const done = list.filter((t) => t.done && isoToKey(t.done_at) === day).sort(byDoneDesc);
  return { open, done };
}

export function blocksForDay(blocks: Record<string, Block>, day: string): Block[] {
  return alive(blocks)
    .filter((b) => b.date === day)
    .sort((a, b) => a.start_min - b.start_min || a.end_min - b.end_min);
}

export interface ActivitySources {
  tasks: Record<string, Task>;
  blocks: Record<string, Block>;
  notes: Record<string, Note>;
  habits: Record<string, Habit>;
  goals: Record<string, Goal>;
  /** Focus sessions finished per day (kept on this device). */
  focus?: Record<string, number>;
}

/**
 * How much you did each day, GitHub-style: tasks written or finished, time blocks planned,
 * notes written, habits checked, goals achieved and focus sessions.
 */
export function activityByDay(src: ActivitySources): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (k: string | null | undefined, n = 1) => {
    if (k) out[k] = (out[k] ?? 0) + n;
  };
  for (const t of Object.values(src.tasks)) {
    if (!t.deleted) add(isoToKey(t.created_at));
    if (t.done) add(isoToKey(t.done_at));
  }
  for (const b of alive(src.blocks)) add(isoToKey(b.created_at));
  for (const n of alive(src.notes)) if (n.title.trim() || n.body.trim()) add(isoToKey(n.updated_at));
  for (const h of alive(src.habits)) for (const d of h.checks ?? []) add(d);
  for (const g of Object.values(src.goals)) {
    if (g.status === 'achieved') add(isoToKey(g.achieved_at));
    if (!g.deleted) for (const st of g.steps ?? []) if (st.done) add(isoToKey(st.done_at));
  }
  for (const [d, n] of Object.entries(src.focus ?? {})) add(d, n);
  return out;
}

/** Days on which you finished something (task, habit, goal or focus session) — drives the streak. */
export function activeDays(
  tasks: Record<string, Task>,
  goals: Record<string, Goal>,
  habits: Record<string, Habit>,
  focus: Record<string, number> = {},
): Set<string> {
  const days = new Set<string>();
  for (const t of Object.values(tasks)) {
    const k = t.done ? isoToKey(t.done_at) : null;
    if (k) days.add(k);
  }
  for (const g of Object.values(goals)) {
    const k = g.status === 'achieved' ? isoToKey(g.achieved_at) : null;
    if (k) days.add(k);
  }
  for (const h of alive(habits)) for (const d of h.checks ?? []) days.add(d);
  for (const [d, n] of Object.entries(focus)) if (n > 0) days.add(d);
  return days;
}

/** Current streak. Today not done yet doesn't break it — the day isn't over. */
export function currentStreak(days: Set<string>, today: string): number {
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** A goal's progress comes from its own steps (an achieved goal is 100%). */
export function goalProgress(goal: Goal) {
  const steps = goal.steps ?? [];
  const done = steps.filter((x) => x.done).length;
  const total = steps.length;
  const progress = goal.status === 'achieved' ? 1 : total ? done / total : 0;
  return { done, total, progress };
}

/**
 * Progress over all your goals, counted in steps: every step is one unit and a goal without steps
 * counts as one unit (done once it's achieved). An achieved goal counts all its units as done.
 */
export function goalsProgress(goals: Record<string, Goal>) {
  let units = 0;
  let doneUnits = 0;
  let achieved = 0;
  let total = 0;
  for (const g of alive(goals)) {
    if (g.status === 'archived') continue;
    total++;
    const steps = g.steps ?? [];
    const n = Math.max(1, steps.length);
    units += n;
    if (g.status === 'achieved') {
      achieved++;
      doneUnits += n;
    } else {
      doneUnits += steps.filter((x) => x.done).length;
    }
  }
  return { units, doneUnits, achieved, total, progress: units ? doneUnits / units : 0 };
}

export function blockNow(list: Block[], nowMin: number) {
  const current = list.find((b) => b.start_min <= nowMin && nowMin < b.end_min) ?? null;
  const upcoming = list.filter((b) => b.start_min > nowMin);
  return { current, upcoming };
}

/** Streak for one habit. Today unchecked doesn't break it — the day isn't over. */
export function habitStreak(h: Habit, today: string): number {
  return currentStreak(new Set(h.checks ?? []), today);
}

export function habitBest(h: Habit): number {
  return bestStreak(new Set(h.checks ?? []));
}

export function subtaskProgress(t: Task) {
  const list = t.subtasks ?? [];
  return { done: list.filter((s) => s.done).length, total: list.length };
}

/* ───────────────────────────── Task history by day ───────────────────────────── */

export interface DayTasks {
  /** Finished that day. */
  done: Task[];
  /** Due that day and not finished that day (finished later, or still open). */
  missed: Task[];
}

/**
 * What each day looked like. A task counts as done on the day you finished it, and as missed on its
 * due date if it wasn't finished by then. Today counts like the Today list: open tasks due today or
 * earlier, plus everything finished today.
 */
export function taskDays(tasks: Record<string, Task>, today: string): Record<string, DayTasks> {
  const out: Record<string, DayTasks> = {};
  const at = (d: string) => (out[d] ??= { done: [], missed: [] });
  for (const t of alive(tasks)) {
    const doneDay = t.done ? isoToKey(t.done_at) : null;
    if (doneDay) at(doneDay).done.push(t);
    if (t.due_date && t.due_date < today && (!doneDay || doneDay > t.due_date)) at(t.due_date).missed.push(t);
    if (!t.done && t.due_date && t.due_date <= today) at(today).missed.push(t);
  }
  // Today: tasks that went overdue earlier are still on today's list — count them once, here.
  if (out[today]) out[today].missed = [...new Map(out[today].missed.map((t) => [t.id, t])).values()];
  return out;
}

/** Share of a day's tasks that got done (null when the day had none). */
export function dayRatio(d: DayTasks | undefined): number | null {
  if (!d) return null;
  const total = d.done.length + d.missed.length;
  return total ? d.done.length / total : null;
}
