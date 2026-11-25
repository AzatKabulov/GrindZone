import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { isImportant } from '@/lib/categories';
import { niceLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { toggleTask } from '@/store/actions';
import type { Task } from '@/store/data';
import { useData } from '@/store/data';
import { alpha, useTheme } from '@/theme';
import { Checkbox } from './Checkbox';
import { Press, Txt } from './ui';

/** One task: a checkbox, the title, and at most one short hint line (important · date · goal). */
export const TaskRow = memo(function TaskRow({
  task,
  showDue = true,
  showGoal = true,
}: {
  task: Task;
  showDue?: boolean;
  showGoal?: boolean;
}) {
  const { c, accent } = useTheme();
  const goal = useData((s) => (task.goal_id ? s.goals[task.goal_id] : undefined));
  const today = todayKey();
  const overdue = !task.done && !!task.due_date && task.due_date < today;
  const important = isImportant(task.priority) && !task.done;

  // Animate the check instantly, commit after the pop so the row doesn't vanish mid-animation.
  // `pending.from` = the done-state we toggled away from; once the store catches up it no longer matches.
  const [pending, setPending] = useState<{ from: boolean } | null>(null);
  const inFlight = !!pending && pending.from === task.done;
  const checked = inFlight ? !task.done : task.done;
  const onToggle = () => {
    if (inFlight) return;
    haptic.light();
    setPending({ from: task.done });
    setTimeout(() => toggleTask(task.id), 380);
  };

  const hints: { text: string; color: string }[] = [];
  if (showDue && task.due_date && !task.done && (overdue || task.due_date !== today)) {
    hints.push({ text: overdue ? `Overdue · ${niceLabel(task.due_date, today)}` : niceLabel(task.due_date, today), color: overdue ? c.danger : c.textDim });
  }
  if (showGoal && goal && !goal.deleted && !task.done) hints.push({ text: goal.title, color: c.textDim });

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={LinearTransition.springify().damping(18)}>
      <Press
        scaleTo={0.985}
        onPress={() => router.push(`/task/${task.id}`)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 14,
          paddingHorizontal: 14,
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: important ? alpha(accent, 0.4) : c.border,
          opacity: task.done ? 0.55 : 1,
        }}
      >
        <Checkbox checked={checked} onToggle={onToggle} />
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
        {important ? <Ionicons name="flame" size={16} color={accent} /> : null}
      </Press>
    </Animated.View>
  );
});
