import { router } from 'expo-router';
import { memo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { PRIORITIES } from '@/lib/categories';
import { relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { toggleTask } from '@/store/actions';
import { useData, type Task } from '@/store/data';
import { useTheme } from '@/theme';
import { Checkbox } from './Checkbox';
import { Icon } from './Icon';
import { Txt } from './ui';

/** Separator inset that lines up with the title text (16 padding + 24 check + 12 gap). */
export const TASK_INSET = 52;

/** Reminders-style row. Swipe right to complete, left to delete. Lives inside a ListSection. */
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
  const swipe = useRef<SwipeableMethods>(null);
  const today = todayKey();
  const overdue = !task.done && !!task.due_date && task.due_date < today;

  // Optimistic check: animate instantly, commit after the pop so the row doesn't vanish mid-animation.
  const [pending, setPending] = useState<{ from: boolean } | null>(null);
  const inFlight = !!pending && pending.from === task.done;
  const checked = inFlight ? !task.done : task.done;
  const onToggle = () => {
    if (inFlight) return;
    haptic.light();
    setPending({ from: task.done });
    setTimeout(() => toggleTask(task.id), 420);
  };

  const meta: { text: string; color: string }[] = [];
  if (showDue && task.due_date) {
    meta.push({
      text: overdue ? `${relativeLabel(task.due_date, today)} · Overdue` : relativeLabel(task.due_date, today),
      color: overdue ? c.red : c.label2,
    });
  }
  if (showGoal && goal && !goal.deleted) meta.push({ text: goal.title, color: c.label2 });
  const marks = PRIORITIES[task.priority].marks;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition.springify().damping(20)}>
      <ReanimatedSwipeable
        ref={swipe}
        friction={1.6}
        leftThreshold={70}
        rightThreshold={70}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableWillOpen={(dir) => {
          haptic.medium();
          swipe.current?.close();
          if (dir === SwipeDirection.RIGHT) setTimeout(() => toggleTask(task.id), 120);
          else setTimeout(() => useData.getState().remove('tasks', task.id), 120);
        }}
        renderLeftActions={() => (
          <View style={{ width: 84, backgroundColor: task.done ? c.gray : accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={task.done ? 'undo' : 'check'} size={20} color="#FFFFFF" weight="bold" />
          </View>
        )}
        renderRightActions={() => (
          <View style={{ width: 84, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trashFill" size={19} color="#FFFFFF" />
          </View>
        )}
      >
        <Pressable
          onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            paddingLeft: 16,
            paddingRight: 14,
            paddingVertical: 12,
            backgroundColor: pressed ? c.fill2 : c.card,
          })}
        >
          <Checkbox checked={checked} onToggle={onToggle} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body" color={checked ? c.label2 : c.label} numberOfLines={3}>
              {marks && !checked ? (
                <Txt variant="body" weight="600" color={accent}>
                  {`${marks} `}
                </Txt>
              ) : null}
              {task.title || 'New Task'}
            </Txt>
            {task.notes && !checked ? (
              <Txt variant="subhead" color={c.label2} numberOfLines={1}>
                {task.notes}
              </Txt>
            ) : null}
            {meta.length ? (
              <Txt variant="subhead" numberOfLines={1}>
                {meta.map((m, i) => (
                  <Txt key={i} variant="subhead" color={m.color}>
                    {i ? '  ·  ' : ''}
                    {m.text}
                  </Txt>
                ))}
              </Txt>
            ) : null}
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
});
