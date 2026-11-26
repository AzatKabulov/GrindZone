import { nowIso, PLAN_DAY_END, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { uuid, useData, type Block, type GoalStep, type Subtask, type Task } from './data';
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

/** Delete a task, with a toast you can tap to undo. */
export function deleteTask(id: string) {
  const { tasks, remove, restore } = useData.getState();
  const task = tasks[id];
  if (!task) return;
  remove('tasks', id);
  haptic.warning();
  useFx.getState().info('TASK DELETED · TAP TO UNDO', task.title || 'Untitled task', () => {
    restore('tasks', id);
    haptic.light();
  });
}

/* ───────────────────────────── Goal steps ───────────────────────────── */

function setGoalSteps(goalId: string, fn: (list: GoalStep[]) => GoalStep[]) {
  const s = useData.getState();
  const g = s.goals[goalId];
  if (!g) return;
  s.patch('goals', goalId, { steps: fn(g.steps ?? []) });
}

export function addGoalStep(goalId: string, title: string) {
  const text = title.trim();
  if (!text) return;
  setGoalSteps(goalId, (l) => [...l, { id: uuid(), title: text, done: false, done_at: null }]);
  haptic.light();
}

export function toggleGoalStep(goalId: string, stepId: string) {
  let nowDone = false;
  setGoalSteps(goalId, (l) =>
    l.map((x) => {
      if (x.id !== stepId) return x;
      nowDone = !x.done;
      return { ...x, done: nowDone, done_at: nowDone ? nowIso() : null };
    }),
  );
  if (nowDone) {
    haptic.success();
    useFx.getState().cheer('STEP DONE');
  } else haptic.light();
}

export function removeGoalStep(goalId: string, stepId: string) {
  setGoalSteps(goalId, (l) => l.filter((x) => x.id !== stepId));
  haptic.light();
}

/**
 * Older versions stored goal steps as tasks linked to the goal (no date, shown under "Someday").
 * Move those into the goal itself (same ids, so running this again — or on another device — changes
 * nothing). A linked task that has a date was planned for a day, so it stays a task and is just unlinked.
 * Tasks linked to a deleted goal also just get unlinked.
 */
export function moveGoalTasksToSteps() {
  const s = useData.getState();
  const byGoal: Record<string, Task[]> = {};
  for (const t of Object.values(s.tasks)) if (!t.deleted && t.goal_id) (byGoal[t.goal_id] ??= []).push(t);
  for (const [goalId, list] of Object.entries(byGoal)) {
    const g = useData.getState().goals[goalId];
    if (!g) continue; // goal not here yet (still syncing): try again next time
    const steps = g.deleted ? [] : list.filter((t) => !t.due_date);
    for (const t of list) if (!steps.includes(t)) s.patch('tasks', t.id, { goal_id: null });
    if (!steps.length) continue;
    const have = new Set((g.steps ?? []).map((x) => x.id));
    const add = steps
      .filter((t) => !have.has(t.id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((t) => ({ id: t.id, title: t.title, done: t.done, done_at: t.done_at }));
    if (add.length) s.patch('goals', goalId, { steps: [...(g.steps ?? []), ...add] });
    for (const t of steps) s.remove('tasks', t.id);
  }
}

/* ───────────────────────────── Time blocks ───────────────────────────── */

/** Delete a time block, with a toast you can tap to undo. */
export function deleteBlock(id: string) {
  const { blocks, remove, restore } = useData.getState();
  const b = blocks[id];
  if (!b) return;
  remove('blocks', id);
  haptic.warning();
  useFx.getState().info('BLOCK DELETED · TAP TO UNDO', b.title || 'Time block', () => {
    restore('blocks', id);
    haptic.light();
  });
}

/** Same block, another day. */
export function duplicateBlock(id: string, toDate: string) {
  const s = useData.getState();
  const b = s.blocks[id];
  if (!b) return;
  s.create('blocks', { date: toDate, start_min: b.start_min, end_min: b.end_min, title: b.title, category: b.category, note: b.note });
  haptic.success();
}

/** Push a block later (or earlier with a negative number), keeping its length, within the day. */
export function shiftBlock(id: string, minutes: number) {
  const s = useData.getState();
  const b = s.blocks[id];
  if (!b) return;
  const len = b.end_min - b.start_min;
  const start = Math.max(0, Math.min(PLAN_DAY_END - len, b.start_min + minutes));
  s.patch('blocks', id, { start_min: start, end_min: start + len });
  haptic.light();
}

/** Add the blocks of a typed/pasted plan to a day (optionally replacing what's there). */
export function addPlanBlocks(date: string, list: { start: number; end: number; title: string; category: Block['category'] }[], replace = false) {
  const s = useData.getState();
  if (replace) for (const b of blocksForDay(s.blocks, date)) s.remove('blocks', b.id);
  s.createMany(
    'blocks',
    list.map((b): Partial<Block> => ({ date, start_min: b.start, end_min: b.end, title: b.title, category: b.category, note: '' })),
  );
  haptic.success();
}

/** Double-tap a block in the plan: crossed out = done. */
export function toggleBlockDone(id: string) {
  const s = useData.getState();
  const b = s.blocks[id];
  if (!b) return;
  const done = !b.done;
  s.patch('blocks', id, { done, done_at: done ? nowIso() : null });
  if (done) {
    haptic.success();
    useFx.getState().cheer('BLOCK DONE');
  } else haptic.light();
}
