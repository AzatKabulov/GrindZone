import { addDays, isoToKey } from '@/lib/date';
import { XP } from '@/lib/xp';
import type { Block, Goal, Task } from './data';

export function alive<T extends { deleted: boolean }>(map: Record<string, T>): T[] {
  return Object.values(map).filter((r) => !r.deleted);
}

export function sortTasks(a: Task, b: Task): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  const ad = a.due_date ?? '9999';
  const bd = b.due_date ?? '9999';
  if (ad !== bd) return ad < bd ? -1 : 1;
  return a.created_at < b.created_at ? -1 : 1;
}

const byDoneDesc = (a: Task, b: Task) => ((a.done_at ?? '') < (b.done_at ?? '') ? 1 : -1);

/** Missions for a given day: open ones due that day or earlier (overdue), plus ones completed that day. */
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

export function taskXp(t: Pick<Task, 'priority'>): number {
  return XP.task[t.priority] ?? XP.task[2];
}

/** XP counts everything you ever completed — deleting a finished task doesn't take XP away. */
export function totalXp(
  tasks: Record<string, Task>,
  blocks: Record<string, Block>,
  goals: Record<string, Goal>,
): number {
  let xp = 0;
  for (const t of Object.values(tasks)) if (t.done) xp += taskXp(t);
  for (const b of Object.values(blocks)) if (b.done) xp += XP.block;
  for (const g of Object.values(goals)) if (g.status === 'achieved') xp += XP.goal;
  return xp;
}

/** Days (YYYY-MM-DD) on which at least one thing was completed. */
export function activeDays(
  tasks: Record<string, Task>,
  blocks: Record<string, Block>,
  goals: Record<string, Goal>,
): Set<string> {
  const days = new Set<string>();
  for (const t of Object.values(tasks)) {
    const k = t.done ? isoToKey(t.done_at) : null;
    if (k) days.add(k);
  }
  for (const b of Object.values(blocks)) if (b.done) days.add(b.date);
  for (const g of Object.values(goals)) {
    const k = g.status === 'achieved' ? isoToKey(g.achieved_at) : null;
    if (k) days.add(k);
  }
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
