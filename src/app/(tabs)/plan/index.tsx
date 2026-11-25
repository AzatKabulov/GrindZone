import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { HeaderActions } from '@/components/header';
import { Icon } from '@/components/Icon';
import { BOTTOM_SPACE, Press, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import {
  addDays,
  dayNum,
  fmtDuration,
  fmtMin,
  longDate,
  minutesNow,
  monthLong,
  parseKey,
  relativeLabel,
  startOfWeek,
  todayKey,
  weekdayShort,
} from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/useNow';
import { clearDay, copyDay, toggleBlock } from '@/store/actions';
import { useData, type Block } from '@/store/data';
import { useFx } from '@/store/fx';
import { alive, blocksForDay } from '@/store/selectors';
import { alpha, mix, shade, squircle, useTheme } from '@/theme';

const HOUR_H = 60;
const GUTTER = 54;

export default function PlanScreen() {
  const { c, accent } = useTheme();
  const today = todayKey();
  const [day, setDay] = useState(today);
  const blocks = useData((s) => s.blocks);
  useNow(30000);

  const list = useMemo(() => blocksForDay(blocks, day), [blocks, day]);
  const planned = useMemo(() => new Set(alive(blocks).map((b) => b.date)), [blocks]);
  const week = useMemo(() => {
    const start = startOfWeek(day);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);
  const layout = useMemo(() => layoutColumns(list), [list]);

  const totalMin = list.reduce((acc, b) => acc + (b.end_min - b.start_min), 0);
  const doneCount = list.filter((b) => b.done).length;
  const isToday = day === today;
  const nowMin = minutesNow();

  const scrollRef = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    const first = list[0]?.start_min ?? 7 * 60;
    const target = day === today ? minutesNow() - 90 : first - 30;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, (target / 60) * HOUR_H), animated: true }), 80);
    return () => clearTimeout(id);
    // only when the selected day changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  // Swipe the week strip to change weeks, like Calendar.
  const touchX = useRef(0);
  const onStripStart = (e: GestureResponderEvent) => {
    touchX.current = e.nativeEvent.pageX;
  };
  const onStripEnd = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - touchX.current;
    if (Math.abs(dx) > 50) {
      haptic.tap();
      setDay(addDays(day, dx < 0 ? 7 : -7));
    }
  };

  const newBlockAt = (start: number) => {
    haptic.light();
    router.push({ pathname: '/block/[id]', params: { id: 'new', date: day, start: String(start) } });
  };
  const onGridPress = (e: GestureResponderEvent) => {
    const min = Math.floor(((e.nativeEvent.locationY / HOUR_H) * 60) / 30) * 30;
    newBlockAt(Math.max(0, Math.min(23 * 60 + 30, min)));
  };
  const nextSlot = () => {
    if (isToday) return Math.min(23 * 60, Math.ceil(minutesNow() / 30) * 30);
    const last = list[list.length - 1];
    return last ? Math.min(23 * 60, last.end_min) : 9 * 60;
  };

  const toast = (text: string, sub: string) => useFx.getState().toast(text, sub);
  const confirmClear = () => {
    if (!list.length) return;
    const run = () => clearDay(day);
    if (Platform.OS === 'web') return run();
    Alert.alert('Clear This Day?', `All ${list.length} blocks on ${relativeLabel(day, today).toLowerCase()} will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Day', style: 'destructive', onPress: run },
    ]);
  };

  const title = `${monthLong(parseKey(day))} ${parseKey(day).getFullYear()}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title }} />
      <HeaderActions
        right={[
          {
            key: 'more',
            label: 'Options',
            icon: 'ellipsis',
            menu: [
              {
                label: 'Copy Yesterday’s Plan',
                icon: 'copy',
                onPress: () => {
                  const n = copyDay(addDays(day, -1), day);
                  toast(n ? `${n} blocks copied` : 'Nothing to copy', n ? 'From yesterday' : 'Yesterday was empty');
                },
              },
              {
                label: 'Repeat Tomorrow',
                icon: 'repeat',
                onPress: () => {
                  const n = copyDay(day, addDays(day, 1));
                  toast(n ? `${n} blocks copied` : 'Nothing to copy', n ? 'To tomorrow' : 'Already planned');
                },
              },
              { label: 'Clear Day', icon: 'trash', destructive: true, onPress: confirmClear },
            ],
          },
          { key: 'add', label: 'New Block', icon: 'plus', onPress: () => newBlockAt(nextSlot()) },
        ]}
      />

      {/* Week strip */}
      <View onTouchStart={onStripStart} onTouchEnd={onStripEnd} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingTop: 6 }}>
        {week.map((d) => {
          const sel = d === day;
          const isT = d === today;
          const fill = sel ? (isT ? accent : c.label) : 'transparent';
          return (
            <Pressable
              key={d}
              onPress={() => {
                haptic.tap();
                setDay(d);
              }}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
            >
              <Txt variant="caption2" weight="600" color={c.label2}>
                {weekdayShort(d).charAt(0)}
              </Txt>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="title3" weight={sel || isT ? '600' : '400'} tabular color={sel ? (isT ? '#FFFFFF' : c.bg) : isT ? accent : c.label}>
                  {dayNum(d)}
                </Txt>
              </View>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: planned.has(d) && !sel ? c.label3 : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt variant="headline">{longDate(day)}</Txt>
          <Txt variant="subhead" color={c.label2} style={{ marginTop: 1 }}>
            {list.length
              ? `${list.length} ${list.length === 1 ? 'block' : 'blocks'} · ${fmtDuration(totalMin)} · ${doneCount} done`
              : 'Nothing planned'}
          </Txt>
        </View>
        {!isToday ? (
          <Press onPress={() => setDay(today)} tapHaptic hitSlop={8}>
            <Txt variant="body" color={accent}>
              Today
            </Txt>
          </Press>
        ) : null}
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator }} />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: BOTTOM_SPACE + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 24 * HOUR_H, marginHorizontal: 12 }}>
          {Array.from({ length: 25 }, (_, h) => (
            <View
              key={h}
              pointerEvents="none"
              style={{ position: 'absolute', top: h * HOUR_H, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}
            >
              <Txt variant="caption2" color={c.label2} tabular style={{ width: GUTTER - 10, textAlign: 'right', paddingRight: 8, marginTop: -1 }}>
                {h < 24 && !(isToday && Math.abs(h * 60 - nowMin) < 14) ? fmtMin(h * 60) : ''}
              </Txt>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: h < 24 ? c.separator : 'transparent' }} />
            </View>
          ))}

          <Pressable onPress={onGridPress} style={{ position: 'absolute', top: 0, bottom: 0, left: GUTTER - 10, right: 0 }} />

          <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: GUTTER - 6, right: 0, zIndex: 2 }}>
            {list.map((b) => (
              <BlockView key={b.id} block={b} col={layout[b.id]?.col ?? 0} cols={layout[b.id]?.cols ?? 1} />
            ))}
          </View>

          {isToday ? (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: (nowMin / 60) * HOUR_H - 7, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 3 }}
            >
              <Txt variant="caption2" weight="700" color={c.red} tabular style={{ width: GUTTER - 10, textAlign: 'right', paddingRight: 6, backgroundColor: c.bg }}>
                {fmtMin(nowMin)}
              </Txt>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.red, marginLeft: 0 }} />
              <View style={{ flex: 1, height: 2, backgroundColor: c.red }} />
            </View>
          ) : null}
        </View>

        {list.length === 0 ? (
          <Animated.View entering={FadeIn} pointerEvents="none" style={{ position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center' }}>
            <View style={[{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: c.card }, squircle]}>
              <Txt variant="subhead" color={c.label2}>
                Tap any hour to block out time.
              </Txt>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function BlockView({ block, col, cols }: { block: Block; col: number; cols: number }) {
  const { c, accent, isDark } = useTheme();
  const color = blockColor(block.category, c, accent);
  const text = isDark ? shade(color, 0.45) : shade(color, -0.45);
  const top = (block.start_min / 60) * HOUR_H;
  const height = Math.max(24, ((block.end_min - block.start_min) / 60) * HOUR_H);
  const cat = BLOCK_CATEGORIES[block.category];
  const roomy = height >= 44;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/block/[id]', params: { id: block.id } })}
      style={({ pressed }) => ({
        position: 'absolute',
        top: top + 1,
        height: height - 2,
        left: `${(col / cols) * 100}%`,
        width: `${100 / cols}%`,
        paddingRight: 2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={[
          {
            flex: 1,
            flexDirection: 'row',
            borderRadius: 7,
            backgroundColor: mix(color, c.bg, isDark ? 0.3 : 0.18),
            overflow: 'hidden',
            opacity: block.done ? 0.55 : 1,
          },
          squircle,
        ]}
      >
        <View style={{ width: 4, backgroundColor: color }} />
        <View style={{ flex: 1, paddingHorizontal: 7, paddingVertical: roomy ? 5 : 2, justifyContent: roomy ? 'flex-start' : 'center' }}>
          <Txt
            variant="footnote"
            weight="600"
            color={text}
            numberOfLines={roomy ? 2 : 1}
            style={{ textDecorationLine: block.done ? 'line-through' : 'none' }}
          >
            {block.title || cat.label}
          </Txt>
          {roomy ? (
            <Txt variant="caption" color={alpha(text, 0.8)} tabular numberOfLines={1}>
              {fmtMin(block.start_min)} – {fmtMin(block.end_min)}
            </Txt>
          ) : null}
        </View>
        <Pressable hitSlop={10} onPress={() => toggleBlock(block.id)} style={{ padding: 6, alignSelf: roomy ? 'flex-start' : 'center' }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 1.5,
              borderColor: color,
              backgroundColor: block.done ? color : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {block.done ? <Icon name="check" size={10} color="#FFFFFF" weight="bold" /> : null}
          </View>
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Side-by-side columns for overlapping blocks. */
function layoutColumns(list: Block[]): Record<string, { col: number; cols: number }> {
  const out: Record<string, { col: number; cols: number }> = {};
  let cluster: Block[] = [];
  let ends: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const b of cluster) out[b.id].cols = ends.length;
    cluster = [];
    ends = [];
    clusterEnd = -1;
  };
  for (const b of list) {
    if (cluster.length && b.start_min >= clusterEnd) flush();
    let col = ends.findIndex((e) => e <= b.start_min);
    if (col === -1) {
      col = ends.length;
      ends.push(b.end_min);
    } else ends[col] = b.end_min;
    out[b.id] = { col, cols: 1 };
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end_min);
  }
  flush();
  return out;
}
