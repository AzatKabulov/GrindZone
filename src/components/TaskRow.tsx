import { router } from 'expo-router';
import { memo, useRef, useState } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { PRIORITIES } from '@/lib/categories';
import { niceLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { toggleTask } from '@/store/actions';
import { useData, type Task } from '@/store/data';
import { justHeld } from '@/store/drag';
import { usePeek } from '@/store/peek';
import { subtaskProgress } from '@/store/selectors';
import { alpha, useTheme } from '@/theme';
import { Checkbox } from './Checkbox';
import { Press, Txt } from './ui';

/**
 * One task: checkbox, emoji, title, one short hint line (date · goal · steps) and its priority emoji.
 * Tap to edit, press and hold for the quick preview.
 * `managed`: the row sits in a ReorderableTasks list, which handles press-and-hold and the animations.
 */
export const TaskRow = memo(function TaskRow({
  task,
  showDue = true,
  showGoal = true,
  managed = false,
}: {
  task: Task;
  showDue?: boolean;
  showGoal?: boolean;
  managed?: boolean;
}) {
  const { c, accent } = useTheme();
  const goal = useData((s) => (task.goal_id ? s.goals[task.goal_id] : undefined));
  const ref = useRef<ViewInstance>(null);
  const today = todayKey();
  const overdue = !task.done && !!task.due_date && task.due_date < today;
  const high = task.priority === 1 && !task.done;
  const steps = subtaskProgress(task);

  // Animate the check instantly, commit after the pop so the row doesn't vanish mid-animation.
  // `pending.from` = the done-state we toggled away from; once the store catches up it no longer matches.
  const [pending, setPending] = useState<{ from: boolean } | null>(null);
  const inFlight = !!pending && pending.from === task.done;
  const checked = inFlight ? !task.done : task.done;
  const onToggle = () => {
    if (inFlight || (managed && justHeld())) return;
    haptic.light();
    setPending({ from: task.done });
    setTimeout(() => toggleTask(task.id), 380);
  };

  const openPeek = () => {
    haptic.medium();
    const node = ref.current;
    if (!node?.measureInWindow) return usePeek.getState().open(task.id, null);
    node.measureInWindow((x, y, w, h) => usePeek.getState().open(task.id, { x, y, w, h }));
  };

  const hints: { text: string; color: string }[] = [];
  if (!task.done) {
    if (showDue && task.due_date && (overdue || task.due_date !== today)) {
      hints.push({ text: overdue ? `Overdue · ${niceLabel(task.due_date, today)}` : niceLabel(task.due_date, today), color: overdue ? c.danger : c.textDim });
    }
    if (steps.total) hints.push({ text: `${steps.done}/${steps.total} steps`, color: steps.done === steps.total ? accent : c.textDim });
    if (showGoal && goal && !goal.deleted) hints.push({ text: goal.title, color: c.textDim });
  }

  return (
    <Animated.View
      entering={managed ? undefined : FadeIn.duration(220)}
      exiting={managed ? undefined : FadeOut.duration(160)}
      layout={managed ? undefined : LinearTransition.springify().damping(18)}
    >
      <View ref={ref} collapsable={false}>
        <Press
          scaleTo={0.985}
          onPress={() => {
            if (managed && justHeld()) return;
            router.push(`/task/${task.id}`);
          }}
          onLongPress={managed ? undefined : openPeek}
          delayLongPress={280}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
            backgroundColor: c.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: high ? alpha(accent, 0.4) : c.border,
            opacity: task.done ? 0.55 : 1,
          }}
        >
          <Checkbox checked={checked} onToggle={onToggle} />
          {task.emoji ? <Text style={{ fontSize: 22 }}>{task.emoji}</Text> : null}
          <View style={{ flex: 1, gap: 3 }}>
            <Txt
              variant="title"
              numberOfLines={2}
              color={task.done ? c.textDim : c.text}
              style={{ fontSize: 15.5, textDecorationLine: task.done ? 'line-through' : 'none', textDecorationColor: c.textFaint }}
            >
              {task.title || 'Untitled task'}
            </Txt>
            {hints.length ? (
              <Txt variant="small" numberOfLines={1}>
                {hints.map((h, i) => (
                  <Txt key={i} variant="small" color={h.color}>
                    {i ? '  ·  ' : ''}
                    {h.text}
                  </Txt>
                ))}
              </Txt>
            ) : null}
          </View>
          {task.done ? null : (
            <Text style={{ fontSize: 17 }} accessibilityLabel={`${PRIORITIES[task.priority].label.toLowerCase()} priority`}>
              {PRIORITIES[task.priority].emoji}
            </Text>
          )}
        </Press>
      </View>
    </Animated.View>
  );
});
