import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIORITIES } from '@/lib/categories';
import { niceLabel } from '@/lib/date';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { haptic } from '@/lib/haptics';
import { addSubtask, removeSubtask, toggleSubtask, toggleTask } from '@/store/actions';
import { useData } from '@/store/data';
import { useFocus } from '@/store/focus';
import { usePeek, type Rect } from '@/store/peek';
import { alpha, fonts, useTheme } from '@/theme';
import { Subtasks } from './Subtasks';
import { Txt, type IconName } from './ui';

/** Mount once at the root (and inside native modals that list tasks). */
export function PeekHost() {
  const taskId = usePeek((s) => s.taskId);
  const origin = usePeek((s) => s.origin);
  if (!taskId) return null;
  return <Peek key={taskId} taskId={taskId} origin={origin} />;
}

/** Press-and-hold preview: the task zooms out of its row while everything behind it blurs. */
function Peek({ taskId, origin }: { taskId: string; origin: Rect | null }) {
  const { c, accent, isDark } = useTheme();
  const task = useData((s) => s.tasks[taskId]);
  const close = usePeek((s) => s.close);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Typing a new step: lift the card above the keyboard and tuck the actions away.
  const kb = useKeyboardHeight();
  const scroller = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (!kb) return;
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [kb]);

  const cardW = width - 32;
  const top = insets.top + 16;
  const p = useSharedValue(0);
  // Where the card's centre ends up (the card + menu sit in the middle of the screen).
  const cardCenter = useSharedValue(height / 2);
  useEffect(() => {
    p.set(withSpring(1, { damping: 19, stiffness: 190, mass: 0.9 }));
  }, [p]);

  // Start where the row was and grow into place.
  const originCenter = origin ? origin.y + origin.h / 2 : null;
  const fromScale = origin ? Math.min(1, origin.w / cardW) * 0.96 : 0.9;

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const card = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.25, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(p.value, [0, 1], [originCenter === null ? 40 : originCenter - cardCenter.value, 0]) },
      { scale: interpolate(p.value, [0, 1], [fromScale, 1]) },
    ],
  }));
  const menu = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.5, 1], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.85, 1]) }],
  }));

  const dismiss = (then?: () => void) => {
    p.set(withTiming(0, { duration: 170 }));
    setTimeout(() => {
      close();
      then?.();
    }, 170);
  };

  if (!task) return null;

  const meta: string[] = [];
  meta.push(`${PRIORITIES[task.priority].emoji} ${PRIORITIES[task.priority].label}`);
  if (task.due_date) meta.push(niceLabel(task.due_date).toUpperCase());

  const actions: { icon: IconName; label: string; danger?: boolean; onPress: () => void }[] = [
    { icon: 'create-outline', label: 'Edit', onPress: () => dismiss(() => router.push(`/task/${task.id}`)) },
    {
      icon: 'timer-outline',
      label: 'Focus on this',
      onPress: () =>
        dismiss(() => {
          useFocus.getState().setTask(task.id);
          router.push('/focus');
        }),
    },
    {
      icon: task.done ? 'refresh' : 'checkmark-circle-outline',
      label: task.done ? 'Mark not done' : 'Mark done',
      onPress: () => dismiss(() => toggleTask(task.id)),
    },
    {
      icon: 'trash-outline',
      label: 'Delete',
      danger: true,
      onPress: () => {
        const run = () =>
          dismiss(() => {
            useData.getState().remove('tasks', task.id);
            haptic.warning();
          });
        if (Platform.OS === 'web') return run();
        Alert.alert('Delete task?', task.title, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: run },
        ]);
      },
    },
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
        <BlurView intensity={45} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(241,238,231,0.45)' }]} onPress={() => dismiss()} />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top, left: 16, right: 16, bottom: kb ? kb + 12 : insets.bottom + 16, justifyContent: kb ? 'flex-end' : 'center' }}
      >
        <Animated.View
          style={[{ maxHeight: kb ? height - kb - top - 24 : height * 0.62 }, card]}
          onLayout={(e) => cardCenter.set(top + e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)}
        >
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: task.priority === 1 ? alpha(accent, 0.5) : c.borderStrong,
              shadowColor: '#000',
              shadowOpacity: 0.4,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: 16 },
              overflow: 'hidden',
            }}
          >
            <ScrollView ref={scroller} contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                {task.emoji ? <Text style={{ fontSize: 40, lineHeight: 46 }}>{task.emoji}</Text> : null}
                <View style={{ flex: 1, gap: 6 }}>
                  <Txt
                    variant="title"
                    style={{ fontSize: 21, lineHeight: 27, textDecorationLine: task.done ? 'line-through' : 'none' }}
                    color={task.done ? c.textDim : c.text}
                  >
                    {task.title || 'Untitled task'}
                  </Txt>
                  {meta.length ? (
                    <Txt variant="label" color={task.priority === 1 ? accent : c.textDim}>
                      {meta.join('  ·  ')}
                    </Txt>
                  ) : null}
                </View>
              </View>
              {task.notes ? (
                <Txt variant="body" color={c.textDim} style={{ lineHeight: 22 }}>
                  {task.notes}
                </Txt>
              ) : null}
              <View style={{ height: 1, backgroundColor: c.border }} />
              <Txt variant="label">STEPS</Txt>
              <Subtasks
                items={task.subtasks ?? []}
                onToggle={(id) => toggleSubtask(task.id, id)}
                onRemove={(id) => removeSubtask(task.id, id)}
                onAdd={(t) => addSubtask(task.id, t)}
              />
            </ScrollView>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            {
              display: kb ? 'none' : 'flex',
              marginTop: 12,
              width: 250,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: isDark ? '#1C1C1F' : '#FFFFFF',
              borderWidth: 1,
              borderColor: c.border,
            },
            menu,
          ]}
        >
          {actions.map((a, i) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 48,
                backgroundColor: pressed ? c.surface2 : 'transparent',
                borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                borderTopColor: c.border,
              })}
            >
              <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 16, color: a.danger ? c.danger : c.text }}>{a.label}</Text>
              <Ionicons name={a.icon} size={19} color={a.danger ? c.danger : c.text} />
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}
