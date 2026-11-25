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
  for (const g of Object.values(src.goals)) if (g.status === 'achieved') add(isoToKey(g.achieved_at));
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

export function goalTasks(tasks: Record<string, Task>, goalId: string): Task[] {
  return alive(tasks)
    .filter((t) => t.goal_id === goalId)
    .sort((a, b) => Number(a.done) - Number(b.done) || sortTasks(a, b));
}

export function goalProgress(goal: Goal, tasks: Record<string, Task>) {
  const linked = goalTasks(tasks, goal.id);
  const done = linked.filter((t) => t.done).length;
  const total = linked.length;
  const progress = goal.status === 'achieved' ? 1 : total ? done / total : 0;
  return { done, total, progress };
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
