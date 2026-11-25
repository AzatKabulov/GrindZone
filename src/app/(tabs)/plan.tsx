import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, type GestureResponderEvent, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ActionSheet } from '@/components/pickers';
import { IconBtn, Press, Screen, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import {
  addDays,
  dayNum,
  fmtDuration,
  fmtMin,
  minutesNow,
  monthShort,
  relativeLabel,
  startOfWeek,
  todayKey,
  weekday,
  weekdayShort,
} from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/useNow';
import { clearDay, copyDay, toggleBlock } from '@/store/actions';
import { useData, type Block } from '@/store/data';
import { useFx } from '@/store/fx';
import { alive, blocksForDay } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';

const HOUR_H = 66;
const GUTTER = 56;

export default function PlanScreen() {
  const { c, accent, onAccent } = useTheme();
  const today = todayKey();
  const [day, setDay] = useState(today);
  const [menu, setMenu] = useState(false);
  const blocks = useData((s) => s.blocks);
  useNow(30000);

  const list = useMemo(() => blocksForDay(blocks, day), [blocks, day]);
  const planned = useMemo(() => new Set(alive(blocks).map((b) => b.date)), [blocks]);
  const week = useMemo(() => {
    const start = startOfWeek(day);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  const totalMin = list.reduce((acc, b) => acc + (b.end_min - b.start_min), 0);
  const doneCount = list.filter((b) => b.done).length;

  const scrollRef = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    const first = list[0]?.start_min ?? 7 * 60;
    const target = day === today ? minutesNow() - 100 : first - 40;
    const id = setTimeout(
      () => scrollRef.current?.scrollTo({ y: Math.max(0, (target / 60) * HOUR_H), animated: true }),
      60,
    );
    return () => clearTimeout(id);
    // only when the selected day changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const newBlockAt = (start: number) => {
    haptic.light();
    router.push({ pathname: '/block/[id]', params: { id: 'new', date: day, start: String(start) } });
  };

  const onGridPress = (e: GestureResponderEvent) => {
    const y = e.nativeEvent.locationY;
    const min = Math.floor(((y / HOUR_H) * 60) / 30) * 30;
    newBlockAt(Math.max(0, Math.min(23 * 60 + 30, min)));
  };

  const nextSlot = () => {
    if (day === today) return Math.min(23 * 60, Math.ceil(minutesNow() / 30) * 30);
    const last = list[list.length - 1];
    return last ? Math.min(23 * 60, last.end_min) : 9 * 60;
  };

  const flash = (text: string, sub: string) => useFx.getState().toast(text, sub);

  const confirmClear = () => {
    const run = () => clearDay(day);
    if (Platform.OS === 'web') return run();
    Alert.alert('Clear this day?', `Delete all ${list.length} blocks planned for ${relativeLabel(day, today).toLowerCase()}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: run },
    ]);
  };

  const layout = useMemo(() => layoutColumns(list), [list]);
  const isToday = day === today;
  const nowMin = minutesNow();

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: 10 }}>
          <View style={{ flex: 1 }}>
            {isToday ? (
              <Txt variant="label">
                {weekday(day)} · {dayNum(day)} {monthShort(day)}
              </Txt>
            ) : (
              <Press onPress={() => setDay(today)} tapHaptic hitSlop={8}>
                <Txt variant="label" color={accent}>
                  ← BACK TO TODAY
                </Txt>
              </Press>
            )}
            <Txt variant="display" style={{ marginTop: 6 }}>
              {isToday ? 'THE PLAN' : relativeLabel(day, today)}
              <Text style={{ color: accent }}>.</Text>
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            <IconBtn icon="ellipsis-horizontal" onPress={() => setMenu(true)} />
            <IconBtn icon="add" accentFill onPress={() => newBlockAt(nextSlot())} />
          </View>
        </View>

        {/* Week strip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
          <Pressable hitSlop={10} onPress={() => { haptic.tap(); setDay(addDays(day, -7)); }} style={{ paddingRight: 6 }}>
            <Ionicons name="chevron-back" size={18} color={c.textFaint} />
          </Pressable>
          {week.map((d) => {
            const sel = d === day;
            const isT = d === today;
            return (
              <Press
                key={d}
                tapHaptic
                scaleTo={0.9}
                onPress={() => setDay(d)}
                style={{
                  flex: 1,
                  marginHorizontal: 2,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: sel ? accent : 'transparent',
                  borderWidth: 1,
                  borderColor: sel ? accent : isT ? alpha(accent, 0.5) : 'transparent',
                }}
              >
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: sel ? alpha(onAccent, 0.75) : c.textFaint }}>
                  {weekdayShort(d).slice(0, 2)}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 22,
                    marginTop: 2,
                    color: sel ? onAccent : isT ? accent : c.text,
                  }}
                >
                  {dayNum(d)}
                </Text>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    marginTop: 2,
                    backgroundColor: planned.has(d) ? (sel ? onAccent : accent) : 'transparent',
                  }}
                />
              </Press>
            );
          })}
          <Pressable hitSlop={10} onPress={() => { haptic.tap(); setDay(addDays(day, 7)); }} style={{ paddingLeft: 6 }}>
            <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, marginBottom: 6 }}>
          <Summary label="BLOCKS" value={String(list.length)} />
          <Summary label="PLANNED" value={totalMin ? fmtDuration(totalMin) : '—'} />
          <Summary label="EXECUTED" value={`${doneCount}/${list.length}`} accent={list.length > 0 && doneCount === list.length} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, marginTop: 6, borderTopWidth: 1, borderTopColor: c.border }}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: TAB_BAR_SPACE }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 24 * HOUR_H, marginHorizontal: 16 }}>
          {/* Hour grid */}
          {Array.from({ length: 25 }, (_, h) => (
            <View key={h} pointerEvents="none" style={{ position: 'absolute', top: h * HOUR_H, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: GUTTER - 10, fontFamily: fonts.mono, fontSize: 10.5, color: c.textFaint, marginTop: -1 }}>
                {h < 24 ? fmtMin(h * 60) : ''}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: h < 24 ? c.border : 'transparent' }} />
            </View>
          ))}
          {Array.from({ length: 24 }, (_, h) => (
            <View
              key={`half-${h}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: h * HOUR_H + HOUR_H / 2,
                left: GUTTER - 10,
                right: 0,
                height: 1,
                backgroundColor: alpha(c.border, 0.45),
              }}
            />
          ))}

          {/* Tap area to create */}
          <Pressable onPress={onGridPress} style={{ position: 'absolute', top: 0, bottom: 0, left: GUTTER - 10, right: 0 }} />

          {/* Blocks */}
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: GUTTER - 6, right: 0 }}>
            {list.map((b) => (
              <BlockCard key={b.id} block={b} col={layout[b.id]?.col ?? 0} cols={layout[b.id]?.cols ?? 1} />
            ))}
          </View>

          {/* Now line */}
          {isToday ? (
            <View pointerEvents="none" style={{ position: 'absolute', top: (nowMin / 60) * HOUR_H - 1, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: GUTTER - 12, height: 18, borderRadius: 5, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: onAccent }}>{fmtMin(nowMin)}</Text>
              </View>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent, marginLeft: 2 }} />
              <View style={{ flex: 1, height: 2, backgroundColor: accent }} />
            </View>
          ) : null}
        </View>

        {list.length === 0 ? (
          <Animated.View entering={FadeIn} style={{ position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
            <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
              <Txt variant="label">TAP ANY SLOT TO BLOCK TIME</Txt>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <ActionSheet
        visible={menu}
        title={`PLAN · ${relativeLabel(day, today)}`}
        onClose={() => setMenu(false)}
        actions={[
          {
            label: "Copy yesterday's plan here",
            icon: 'copy-outline',
            onPress: () => {
              const n = copyDay(addDays(day, -1), day);
              flash(n ? `+${n} BLOCKS` : 'NOTHING TO COPY', n ? 'COPIED FROM YESTERDAY' : 'YESTERDAY WAS EMPTY');
            },
          },
          {
            label: 'Repeat this plan tomorrow',
            icon: 'repeat-outline',
            onPress: () => {
              const n = copyDay(day, addDays(day, 1));
              flash(n ? `+${n} BLOCKS` : 'NOTHING TO COPY', n ? 'COPIED TO TOMORROW' : 'ALREADY THERE');
            },
          },
          {
            label: 'Clear this day',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => (list.length ? confirmClear() : undefined),
          },
        ]}
      />
    </Screen>
  );
}

function Summary({ label, value, accent: hl }: { label: string; value: string; accent?: boolean }) {
  const { accent } = useTheme();
  return (
    <View>
      <Txt variant="label" style={{ fontSize: 9 }}>
        {label}
      </Txt>
      <Txt variant="h2" color={hl ? accent : undefined} style={{ fontSize: 22, marginTop: 2 }}>
        {value}
      </Txt>
    </View>
  );
}

function BlockCard({ block, col, cols }: { block: Block; col: number; cols: number }) {
  const { c, accent, isDark } = useTheme();
  const color = blockColor(block.category, accent);
  const top = (block.start_min / 60) * HOUR_H;
  const height = Math.max(26, ((block.end_min - block.start_min) / 60) * HOUR_H);
  const cat = BLOCK_CATEGORIES[block.category];
  const roomy = height >= 50;

  return (
    <Press
      scaleTo={0.97}
      onPress={() => router.push({ pathname: '/block/[id]', params: { id: block.id } })}
      style={{
        position: 'absolute',
        top: top + 1,
        height: height - 2,
        left: `${(col / cols) * 100}%`,
        width: `${100 / cols}%`,
        paddingRight: 3,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          borderRadius: 10,
          backgroundColor: alpha(color, isDark ? 0.16 : 0.15),
          borderLeftWidth: 3,
          borderLeftColor: color,
          paddingLeft: 10,
          paddingRight: 6,
          paddingVertical: roomy ? 7 : 3,
          overflow: 'hidden',
          opacity: block.done ? 0.6 : 1,
        }}
      >
        <View style={{ flex: 1, justifyContent: roomy ? 'flex-start' : 'center' }}>
          <Txt
            variant="title"
            numberOfLines={roomy ? 2 : 1}
            style={{
              fontSize: 14,
              lineHeight: 18,
              textDecorationLine: block.done ? 'line-through' : 'none',
            }}
          >
            {block.title || cat.label}
          </Txt>
          {roomy ? (
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.6, color: color, marginTop: 3 }} numberOfLines={1}>
              {fmtMin(block.start_min)}–{fmtMin(block.end_min)} · {cat.label}
            </Text>
          ) : null}
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => toggleBlock(block.id)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            marginTop: roomy ? 0 : 0,
            alignSelf: roomy ? 'flex-start' : 'center',
            borderWidth: 1.5,
            borderColor: block.done ? color : alpha(color, 0.7),
            backgroundColor: block.done ? color : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {block.done ? <Ionicons name="checkmark-sharp" size={14} color={c.bg} /> : null}
        </Pressable>
      </View>
    </Press>
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
