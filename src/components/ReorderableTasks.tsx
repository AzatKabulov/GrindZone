import { memo, useEffect, useMemo, useRef } from 'react';
import { View, type ViewInstance } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { runOnUI, scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/lib/haptics';
import { moveTask } from '@/store/actions';
import type { Task } from '@/store/data';
import { closeSwipes, markHeld, setDragging } from '@/store/drag';
import { usePeek } from '@/store/peek';
import { SwipeFrame, useSwipeToDelete } from './SwipeToDelete';
import { TaskRow } from './TaskRow';

/*
 * A task list you can rearrange.
 *
 *   tap              → open the task
 *   swipe left       → Delete (see SwipeToDelete)
 *   press and hold   → the row lifts
 *     · let go       → quick preview (blurred background, steps, actions)
 *     · drag         → move it; the others slide out of the way
 *
 * Rows are absolutely positioned from a shared `order` (ids) and their measured heights, so a drop
 * never makes rows jump: the order shown while dragging is the order that gets saved.
 * The first frame renders in normal flow to measure the rows, then switches to absolute positions.
 */

const GAP = 8;
const ESTIMATE = 56;
const HOLD_MS = 300;

type Positions = { pos: Record<string, number>; total: number };

function positionsFor(order: string[], heights: Record<string, number>): Positions {
  'worklet';
  const pos: Record<string, number> = {};
  let y = 0;
  for (let i = 0; i < order.length; i++) {
    pos[order[i]] = y;
    y += (heights[order[i]] ?? ESTIMATE) + GAP;
  }
  return { pos, total: Math.max(0, y - GAP) };
}

interface Shared {
  /** Saved order (ids), mirrors the `tasks` prop. */
  order: SharedValue<string[]>;
  /** Order while a drag is in progress (empty when not dragging). */
  dragOrder: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  layout: SharedValue<Positions>;
  activeId: SharedValue<string>;
  /** Rows are measured and absolutely positioned. */
  abs: SharedValue<boolean>;
  /** A moment after `abs`: position changes animate and rows can be dragged. */
  live: SharedValue<boolean>;
}

export const ReorderableTasks = memo(function ReorderableTasks({
  tasks,
  groupOf,
  showDue = true,
  showGoal = true,
}: {
  tasks: Task[];
  /** Rows can only move among rows with the same group (e.g. the same due date). */
  groupOf?: (t: Task) => string;
  showDue?: boolean;
  showGoal?: boolean;
}) {
  const ids = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const idsKey = ids.join(',');
  const groups = useMemo(() => {
    const g: Record<string, string> = {};
    for (const t of tasks) g[t.id] = groupOf ? groupOf(t) : '';
    return g;
  }, [tasks, groupOf]);

  const order = useSharedValue<string[]>(ids);
  const dragOrder = useSharedValue<string[]>([]);
  const heights = useSharedValue<Record<string, number>>({});
  const activeId = useSharedValue('');
  const abs = useSharedValue(false);
  const live = useSharedValue(false);
  const layout = useDerivedValue(() => positionsFor(dragOrder.value.length ? dragOrder.value : order.value, heights.value));
  const shared = useMemo<Shared>(
    () => ({ order, dragOrder, heights, layout, activeId, abs, live }),
    [order, dragOrder, heights, layout, activeId, abs, live],
  );

  // Keep the shared order in step with the list we were given.
  useEffect(() => {
    runOnUI((next: string[]) => {
      'worklet';
      order.value = next;
    })(idsKey ? idsKey.split(',') : []);
  }, [idsKey, order]);

  // Rows report their heights. Once every row is measured we switch to absolute positions (on the UI
  // thread, so the switch is seamless); a moment later position changes start animating.
  const measured = useRef<Record<string, number>>({});
  const onHeight = (id: string, h: number) => {
    if (measured.current[id] === h) return;
    measured.current = { ...measured.current, [id]: h };
    heights.set(measured.current);
  };
  const goLive = () => setTimeout(() => live.set(true), 120);
  useAnimatedReaction(
    () => order.value.every((id) => heights.value[id] !== undefined),
    (all) => {
      if (all && !abs.value) {
        abs.value = true;
        scheduleOnRN(goLive);
      }
    },
  );

  const total = useSharedValue(0);
  useAnimatedReaction(
    () => layout.value.total,
    (t, prev) => {
      total.value = prev === null || !live.value ? t : withTiming(t, { duration: 220 });
    },
  );
  const box = useAnimatedStyle(() => (abs.value ? { height: live.value ? total.value : layout.value.total } : {}));

  const onMove = (from: number, to: number) => moveTask(tasks, from, to);

  return (
    <Animated.View style={[{ gap: GAP }, box]}>
      {tasks.map((t) => (
        <Item
          key={t.id}
          task={t}
          shared={shared}
          groups={groups}
          onHeight={onHeight}
          onMove={onMove}
          showDue={showDue}
          showGoal={showGoal}
        />
      ))}
    </Animated.View>
  );
});

const Item = memo(function Item({
  task,
  shared,
  groups,
  onHeight,
  onMove,
  showDue,
  showGoal,
}: {
  task: Task;
  shared: Shared;
  groups: Record<string, string>;
  onHeight: (id: string, h: number) => void;
  onMove: (from: number, to: number) => void;
  showDue: boolean;
  showGoal: boolean;
}) {
  const id = task.id;
  const { order, dragOrder, heights, layout, activeId, abs, live } = shared;
  const ref = useRef<ViewInstance>(null);
  const top = useSharedValue(0);
  /** Finger offset while dragging (a transform, so following the finger needs no re-layout). */
  const dy = useSharedValue(0);
  const lift = useSharedValue(0);
  const moved = useSharedValue(false);
  const slot = useSharedValue(-1);

  // Follow our slot; slide when it changes (unless we're the row under the finger).
  useAnimatedReaction(
    () => layout.value.pos[id],
    (y, prev) => {
      if (y === undefined || activeId.value === id) return;
      top.value = prev === null || prev === undefined || !live.value ? y : withTiming(y, { duration: 220 });
    },
  );

  const style = useAnimatedStyle(() => {
    const on = activeId.value === id;
    // Until animations are on, sit exactly on the computed slot (no lag behind the reaction above).
    const y = live.value ? top.value : (layout.value.pos[id] ?? 0);
    return {
      position: abs.value ? 'absolute' : 'relative',
      left: 0,
      right: 0,
      top: abs.value ? y : 0,
      zIndex: on ? 20 : 0,
      transform: [{ translateY: dy.value }, { scale: 1 + lift.value * 0.03 }],
      shadowOpacity: lift.value * 0.35,
    };
  });

  const lifted = () => {
    closeSwipes();
    setDragging(true);
    haptic.medium();
  };
  const crossed = () => haptic.tap();
  const peek = () => {
    setDragging(false);
    const node = ref.current;
    if (!node?.measureInWindow) return usePeek.getState().open(id, null);
    node.measureInWindow((x, y, w, h) => usePeek.getState().open(id, { x, y, w, h }));
  };
  const dropped = (from: number, to: number) => {
    setDragging(false);
    if (from !== to) {
      haptic.light();
      onMove(from, to);
    }
  };

  const pan = usePanGesture({
    enabled: live,
    activateAfterLongPress: HOLD_MS,
    onActivate: () => {
      'worklet';
      activeId.value = id;
      dy.value = 0;
      moved.value = false;
      slot.value = order.value.indexOf(id);
      lift.value = withSpring(1, { damping: 16, stiffness: 260 });
      scheduleOnRN(lifted);
    },
    onUpdate: (e) => {
      'worklet';
      if (activeId.value !== id) return;
      if (!moved.value && Math.abs(e.translationY) > 8) moved.value = true;
      dy.value = e.translationY;
      if (!moved.value) return;

      // Where would we land? Count the rows whose middle is above ours, among rows of our group.
      const saved = order.value;
      const base = positionsFor(saved, heights.value).pos;
      const mid = top.value + dy.value + (heights.value[id] ?? ESTIMATE) / 2;
      const others = saved.filter((x) => x !== id);
      let t = 0;
      for (let i = 0; i < others.length; i++) {
        const o = others[i];
        if (base[o] + (heights.value[o] ?? ESTIMATE) / 2 < mid) t = i + 1;
      }
      const g = groups[id];
      let lo = -1;
      let hi = -1;
      for (let i = 0; i < others.length; i++) {
        if (groups[others[i]] === g) {
          if (lo < 0) lo = i;
          hi = i + 1;
        }
      }
      if (lo < 0) t = saved.indexOf(id);
      else t = Math.max(lo, Math.min(hi, t));

      if (t !== slot.value) {
        slot.value = t;
        const next = others.slice();
        next.splice(t, 0, id);
        dragOrder.value = next;
        scheduleOnRN(crossed);
      }
    },
    onDeactivate: () => {
      'worklet';
      if (activeId.value !== id) return;
      scheduleOnRN(markHeld);
      lift.value = withTiming(0, { duration: 180 });

      // Held and let go without moving: show the preview.
      if (!moved.value) {
        dy.value = withTiming(0, { duration: 120 });
        activeId.value = '';
        dragOrder.value = [];
        scheduleOnRN(peek);
        return;
      }

      const final = dragOrder.value.length ? dragOrder.value : order.value;
      const from = order.value.indexOf(id);
      const to = final.indexOf(id);
      // Jump `top` to the new slot and glide the transform from where the finger left the row.
      const slotY = layout.value.pos[id] ?? top.value;
      dy.value = top.value + dy.value - slotY;
      top.value = slotY;
      dy.value = withTiming(0, { duration: 170 }, () => {
        // The order on screen becomes the saved order right away, so nothing moves when the store catches up.
        order.value = final;
        dragOrder.value = [];
        activeId.value = '';
        scheduleOnRN(dropped, from, to);
      });
    },
    onFinalize: (e) => {
      'worklet';
      // Interrupted (e.g. a system gesture): put everything back.
      if (e.canceled && activeId.value === id) {
        lift.value = withTiming(0, { duration: 150 });
        dragOrder.value = [];
        activeId.value = '';
        dy.value = withTiming(0, { duration: 180 });
        scheduleOnRN(setDragging, false);
      }
    },
  });

  // Hold (to drag or preview) and swipe (to delete) compete: whichever starts first wins.
  const swipe = useSwipeToDelete(id);
  const gesture = useCompetingGestures(pan, swipe.gesture);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(160)}
        onLayout={(e) => onHeight(id, e.nativeEvent.layout.height)}
        style={[
          { shadowColor: '#000', shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
          style,
        ]}
      >
        <SwipeFrame swipe={swipe}>
          <View ref={ref} collapsable={false}>
            <TaskRow task={task} showDue={showDue} showGoal={showGoal} managed />
          </View>
        </SwipeFrame>
      </Animated.View>
    </GestureDetector>
  );
});
