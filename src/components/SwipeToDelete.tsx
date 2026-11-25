import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/lib/haptics';
import { deleteTask } from '@/store/actions';
import { markBusy, useSwipeOpen } from '@/store/drag';
import { fonts, useTheme } from '@/theme';

/*
 * Swipe a task left to reveal Delete (like Mail or Reminders).
 *   short swipe → the row stays open on the Delete button; tap it to delete
 *   long swipe  → past ~55% of the width it deletes straight away
 * Tapping a row, scrolling or opening another row closes it. Deleting shows an undo toast.
 */

const ACTION_W = 88;
const FULL = 0.55;
const SNAP = { duration: 220, easing: Easing.out(Easing.cubic) };

export interface Swipe {
  gesture: ReturnType<typeof usePanGesture>;
  tx: SharedValue<number>;
  width: SharedValue<number>;
  remove: () => void;
}

export function useSwipeToDelete(id: string): Swipe {
  const tx = useSharedValue(0);
  const start = useSharedValue(0);
  const width = useSharedValue(360);
  const pastFull = useSharedValue(false);
  const isOpen = useSwipeOpen((s) => s.openId === id);

  const claim = () => useSwipeOpen.setState({ openId: id });
  const release = () => {
    if (useSwipeOpen.getState().openId === id) useSwipeOpen.setState({ openId: '' });
  };
  const doDelete = () => {
    release();
    deleteTask(id);
  };
  const tick = () => haptic.tap();

  const remove = () => {
    tx.set(withTiming(-width.value - 24, { duration: 180 }, () => scheduleOnRN(doDelete)));
  };

  const gesture = usePanGesture({
    // If the swipe is interrupted, let taps through again.
    onFinalize: (e) => {
      'worklet';
      if (e.canceled) scheduleOnRN(markBusy, 0);
    },
    activeOffsetX: [-14, 14],
    failOffsetY: [-12, 12],
    onActivate: () => {
      'worklet';
      start.value = tx.value;
      pastFull.value = false;
      scheduleOnRN(markBusy, 60000);
      scheduleOnRN(claim);
    },
    onUpdate: (e) => {
      'worklet';
      let x = start.value + e.translationX;
      if (x > 0) x = x / 4; // nothing on the left: resist
      tx.value = x;
      const full = -x > width.value * FULL;
      if (full !== pastFull.value) {
        pastFull.value = full;
        scheduleOnRN(tick);
      }
    },
    onDeactivate: (e) => {
      'worklet';
      scheduleOnRN(markBusy, 400);
      const x = tx.value;
      if (-x > width.value * FULL) {
        tx.value = withTiming(-width.value - 24, { duration: 160 }, () => scheduleOnRN(doDelete));
        return;
      }
      const open = x < -ACTION_W / 2 ? e.velocityX < 500 : e.velocityX < -700;
      tx.value = withTiming(open ? -ACTION_W : 0, SNAP);
      if (!open) scheduleOnRN(release);
    },
  });

  // Another row opened, the list scrolled or a row was tapped: close.
  useEffect(() => {
    if (!isOpen) tx.set(withTiming(0, SNAP));
  }, [isOpen, tx]);

  return { gesture, tx, width, remove };
}

/** The red Delete button behind the row, plus the row that slides over it. */
export function SwipeFrame({ swipe, children }: { swipe: Swipe; children: ReactNode }) {
  const { c } = useTheme();
  const { tx, width } = swipe;
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const under = useAnimatedStyle(() => ({
    width: Math.max(0, -tx.value),
    opacity: interpolate(-tx.value, [0, 24], [0, 1], 'clamp'),
  }));
  return (
    <View onLayout={(e) => width.set(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, right: 0, paddingLeft: 8 }, under]}>
        <Pressable
          onPress={swipe.remove}
          accessibilityRole="button"
          accessibilityLabel="Delete task"
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: 14,
            backgroundColor: c.danger,
            opacity: pressed ? 0.8 : 1,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          })}
        >
          <View style={{ alignItems: 'center', gap: 3, width: ACTION_W - 8 }}>
            <Ionicons name="trash" size={19} color="#fff" />
            <Animated.Text style={[styles.label, { fontFamily: fonts.mono }]}>DELETE</Animated.Text>
          </View>
        </Pressable>
      </Animated.View>
      <Animated.View style={row}>{children}</Animated.View>
    </View>
  );
}

/** For plain lists (e.g. completed tasks): the row with its own swipe gesture. */
export function SwipeToDelete({ id, children }: { id: string; children: ReactNode }) {
  const swipe = useSwipeToDelete(id);
  return (
    <GestureDetector gesture={swipe.gesture}>
      <View>
        <SwipeFrame swipe={swipe}>{children}</SwipeFrame>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  label: { color: '#fff', fontSize: 10, letterSpacing: 1.4 },
});
