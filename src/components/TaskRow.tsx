import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { PRIORITIES } from '@/lib/categories';
import { relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { toggleTask } from '@/store/actions';
import type { Task } from '@/store/data';
import { useData } from '@/store/data';
import { taskXp } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';
import { Checkbox } from './Checkbox';
import { Press, Txt, type IconName } from './ui';

export const TaskRow = memo(function TaskRow({
  task,
  showDue = true,
  showGoal = true,
  compact,
}: {
  task: Task;
  showDue?: boolean;
  showGoal?: boolean;
  compact?: boolean;
}) {
  const { c, accent } = useTheme();
  const goal = useData((s) => (task.goal_id ? s.goals[task.goal_id] : undefined));
  const today = todayKey();
  const overdue = !task.done && !!task.due_date && task.due_date < today;
  const pColor = task.priority === 1 ? accent : task.priority === 2 ? c.textDim : c.textFaint;

  // Optimistic check: animate instantly, commit after the pop so the row doesn't vanish mid-animation.
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

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={LinearTransition.springify().damping(18)}>
      <Press
        scaleTo={0.985}
        onPress={() => router.push(`/task/${task.id}`)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: compact ? 11 : 14,
          paddingHorizontal: 14,
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: task.priority === 1 && !task.done ? alpha(accent, 0.35) : c.border,
          opacity: task.done ? 0.62 : 1,
        }}
      >
        <Checkbox checked={checked} onToggle={onToggle} />
        <View style={{ flex: 1, gap: 5 }}>
          <Txt
            variant="title"
            numberOfLines={2}
            color={task.done ? c.textDim : c.text}
            style={{
              fontSize: 15.5,
              textDecorationLine: task.done ? 'line-through' : 'none',
              textDecorationColor: c.textFaint,
            }}
          >
            {task.title || 'Untitled mission'}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Meta text={PRIORITIES[task.priority].label} color={pColor} bold={task.priority === 1} />
            {showDue && task.due_date ? (
              <Meta
                icon={overdue ? 'alert-circle' : 'calendar-clear-outline'}
                text={overdue ? `OVERDUE · ${relativeLabel(task.due_date, today)}` : relativeLabel(task.due_date, today)}
                color={overdue ? c.danger : c.textFaint}
              />
            ) : null}
            {showGoal && goal && !goal.deleted ? (
              <Meta icon="locate-outline" text={goal.title.toUpperCase()} color={c.textFaint} />
            ) : null}
            {task.notes ? <Ionicons name="document-text-outline" size={11} color={c.textFaint} /> : null}
          </View>
        </View>
        {!task.done ? (
          <Txt variant="label" color={c.textFaint} style={{ fontSize: 9.5 }}>
            +{taskXp(task)}
          </Txt>
        ) : (
          <Ionicons name="flash" size={13} color={accent} />
        )}
      </Press>
    </Animated.View>
  );
});

function Meta({
  text,
  color,
  icon,
  bold,
}: {
  text: string;
  color: string;
  icon?: IconName;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 200 }}>
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Txt
        numberOfLines={1}
        style={{ fontFamily: bold ? fonts.monoBold : fonts.mono, fontSize: 10, letterSpacing: 1.1, color }}
      >
        {text}
      </Txt>
    </View>
  );
}
