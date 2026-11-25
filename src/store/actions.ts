import { nowIso, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { uuid, useData, type Block, type Subtask, type Task } from './data';
import { useFx } from './fx';
import { blocksForDay, tasksForDay } from './selectors';

/** High-level actions that also deliver the reward: haptics, a fresh quote, celebrations. */

export function toggleTask(id: string) {
  const s = useData.getState();
  const t = s.tasks[id];
  if (!t) return;
  const today = todayKey();
  const openBefore = tasksForDay(s.tasks, today).open.length;

  if (t.done) {
    s.patch('tasks', id, { done: false, done_at: null });
    haptic.light();
    return;
  }

  s.patch('tasks', id, { done: true, done_at: nowIso() });
  haptic.success();

  const openAfter = tasksForDay(useData.getState().tasks, today).open.length;
  if (openBefore > 0 && openAfter === 0) {
    haptic.celebrate();
    useFx.getState().celebrate({ kind: 'daywon', kicker: 'ALL TASKS DONE', title: 'DAY WON' });
  } else {
    useFx.getState().cheer('TASK DONE');
  }
}

export function setGoalAchieved(id: string, achieved: boolean) {
  const s = useData.getState();
  const g = s.goals[id];
  if (!g) return;
  if (!achieved) {
    s.patch('goals', id, { status: 'active', achieved_at: null });
    haptic.light();
    return;
  }
  s.patch('goals', id, { status: 'achieved', achieved_at: nowIso() });
  haptic.celebrate();
  useFx.getState().celebrate({ kind: 'goal', kicker: 'GOAL ACHIEVED', title: g.title.toUpperCase() || 'GOAL' });
}

/* ───────────────────────────── Subtasks ───────────────────────────── */

function setSubtasks(taskId: string, fn: (list: Subtask[]) => Subtask[]) {
  const s = useData.getState();
  const t = s.tasks[taskId];
  if (!t) return;
  s.patch('tasks', taskId, { subtasks: fn(t.subtasks ?? []) });
}

export function addSubtask(taskId: string, title: string) {
  const text = title.trim();
  if (!text) return;
  setSubtasks(taskId, (l) => [...l, { id: uuid(), title: text, done: false }]);
  haptic.light();
}

export function toggleSubtask(taskId: string, subId: string) {
  const t = useData.getState().tasks[taskId];
  const wasDone = t?.subtasks?.find((x) => x.id === subId)?.done ?? false;
  setSubtasks(taskId, (l) => l.map((x) => (x.id === subId ? { ...x, done: !x.done } : x)));
  if (wasDone) haptic.light();
  else haptic.success();
}

export function removeSubtask(taskId: string, subId: string) {
  setSubtasks(taskId, (l) => l.filter((x) => x.id !== subId));
  haptic.light();
}

/* ───────────────────────────── Habits ───────────────────────────── */

export function toggleHabit(habitId: string, day = todayKey()) {
  const s = useData.getState();
  const h = s.habits[habitId];
  if (!h) return;
  const checks = h.checks ?? [];
  if (checks.includes(day)) {
    s.patch('habits', habitId, { checks: checks.filter((d) => d !== day) });
    haptic.light();
    return;
  }
  s.patch('habits', habitId, { checks: [...checks, day].sort() });
  haptic.success();
  if (day === todayKey()) useFx.getState().cheer(`${h.title.toUpperCase() || 'HABIT'} · DONE`);
}

/* ───────────────────────────── Plan ───────────────────────────── */

/** Copy every block of `from` into `to` (skips blocks that already exist at the same time). */
export function copyDay(from: string, to: string): number {
  const s = useData.getState();
  const src = blocksForDay(s.blocks, from);
  const existing = blocksForDay(s.blocks, to);
  const fresh = src.filter((b) => !existing.some((e) => e.start_min === b.start_min && e.title === b.title));
  s.createMany(
    'blocks',
    fresh.map(
      (b): Partial<Block> => ({
        date: to,
        start_min: b.start_min,
        end_min: b.end_min,
        title: b.title,
        category: b.category,
        note: b.note,
      }),
    ),
  );
  if (fresh.length) haptic.success();
  return fresh.length;
}

/**
 * Move a task inside a list you see on screen (`list` = that list in its current order).
 * Usually only the moved task changes: it takes a sort_order between its new neighbours.
 * When the neighbours share the same value, the whole list is renumbered.
 */
export function moveTask(list: Task[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  const { patch } = useData.getState();
  const prev = next[to - 1]?.sort_order;
  const after = next[to + 1]?.sort_order;
  let order: number | null = null;
  if (prev === undefined && after !== undefined) order = after - 1;
  else if (after === undefined && prev !== undefined) order = prev + 1;
  else if (prev !== undefined && after !== undefined && prev < after) order = (prev + after) / 2;
  if (order !== null && order !== prev && order !== after) {
    patch('tasks', moved.id, { sort_order: order });
    return;
  }
  next.forEach((t, i) => {
    if (t.sort_order !== i + 1) patch('tasks', t.id, { sort_order: i + 1 });
  });
}
