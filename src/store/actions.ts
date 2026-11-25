import { nowIso, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { COMPLETION_LINES } from '@/lib/quotes';
import { levelInfo, XP } from '@/lib/xp';
import { useData, type Block } from './data';
import { useFx } from './fx';
import { blocksForDay, taskXp, tasksForDay, totalXp } from './selectors';

/** High-level actions that also deliver the dopamine: haptics, XP toasts, celebrations. */

const xpNow = () => {
  const s = useData.getState();
  return totalXp(s.tasks, s.blocks, s.goals);
};

function rewardLevelUp(before: number, after: number) {
  const a = levelInfo(before);
  const b = levelInfo(after);
  if (b.level > a.level) {
    haptic.celebrate();
    useFx.getState().celebrate({
      kind: 'levelup',
      kicker: 'LEVEL UP',
      title: `LVL ${b.level}`,
      subtitle: b.rank !== a.rank ? `NEW RANK: ${b.rank}` : `RANK: ${b.rank}`,
    });
    return true;
  }
  return false;
}

export function toggleTask(id: string) {
  const s = useData.getState();
  const t = s.tasks[id];
  if (!t) return;
  const today = todayKey();
  const openBefore = tasksForDay(s.tasks, today).open.length;
  const before = xpNow();

  if (t.done) {
    s.patch('tasks', id, { done: false, done_at: null });
    haptic.light();
    return;
  }

  s.patch('tasks', id, { done: true, done_at: nowIso() });
  haptic.success();
  useFx.getState().toast(`+${taskXp(t)} XP`, 'TASK DONE');

  const leveled = rewardLevelUp(before, xpNow());
  const openAfter = tasksForDay(useData.getState().tasks, today).open.length;
  if (!leveled && openBefore > 0 && openAfter === 0) {
    haptic.celebrate();
    useFx.getState().celebrate({
      kind: 'daywon',
      kicker: 'ALL TASKS DONE',
      title: 'DAY WON',
      subtitle: COMPLETION_LINES[Math.floor(Math.random() * COMPLETION_LINES.length)],
    });
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
  const before = xpNow();
  s.patch('goals', id, { status: 'achieved', achieved_at: nowIso() });
  haptic.celebrate();
  const after = levelInfo(xpNow());
  const leveledUp = after.level > levelInfo(before).level;
  useFx.getState().celebrate({
    kind: 'goal',
    kicker: 'GOAL ACHIEVED',
    title: g.title.toUpperCase() || 'GOAL',
    subtitle: leveledUp ? `+${XP.goal} XP · NOW LVL ${after.level} ${after.rank}` : `+${XP.goal} XP`,
  });
}

/** Copy every block of `from` into `to` (skips blocks that already exist at the same time). */
export function copyDay(from: string, to: string): number {
  const s = useData.getState();
  const src = blocksForDay(s.blocks, from);
  const existing = blocksForDay(s.blocks, to);
  const fresh = src.filter(
    (b) => !existing.some((e) => e.start_min === b.start_min && e.title === b.title),
  );
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
