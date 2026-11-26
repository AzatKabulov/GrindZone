import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type GestureResponderEvent, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { openBlockMenu } from '@/components/blockMenu';
import { PlanAgenda } from '@/components/PlanAgenda';
import { PlanImport } from '@/components/PlanImport';
import { Button, IconBtn, Press, Screen, TAB_BAR_SPACE, Txt } from '@/components/ui';
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
import { copyDay } from '@/store/actions';
import { useData, type Block } from '@/store/data';
import { useFx } from '@/store/fx';
import { useSettings } from '@/store/settings';
import { alive, blocksForDay } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';

const HOUR_H = 66;
const GUTTER = 56;

export default function PlanScreen() {
  const { c, accent, onAccent } = useTheme();
  const today = todayKey();
  const [day, setDay] = useState(today);
  const blocks = useData((s) => s.blocks);
  const view = useSettings((s) => s.planView ?? 'list');
  const setSettings = useSettings((s) => s.set);
  const [importing, setImporting] = useState(false);
  useNow(30000);

  const list = useMemo(() => blocksForDay(blocks, day), [blocks, day]);
  const planned = useMemo(() => new Set(alive(blocks).map((b) => b.date)), [blocks]);
  const week = useMemo(() => {
    const start = startOfWeek(day);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  const totalMin = list.reduce((acc, b) => acc + (b.end_min - b.start_min), 0);
  const yesterdayCount = useMemo(() => blocksForDay(blocks, addDays(day, -1)).length, [blocks, day]);

  const scrollRef = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (view !== 'timeline') return;
    const first = list[0]?.start_min ?? 7 * 60;
    const target = day === today ? minutesNow() - 100 : first - 40;
    const id = setTimeout(
      () => scrollRef.current?.scrollTo({ y: Math.max(0, (target / 60) * HOUR_H), animated: true }),
      60,
    );
    return () => clearTimeout(id);
    // only when the selected day (or the view) changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, view]);

  // The timeline grows past 24:00 when the plan runs after midnight.
  const hours = Math.max(24, Math.ceil(Math.max(0, ...list.map((b) => b.end_min)) / 60));

  const newBlockAt = (start: number) => {
    haptic.light();
    router.push({ pathname: '/block/[id]', params: { id: 'new', date: day, start: String(start) } });
  };

  const onGridPress = (e: GestureResponderEvent) => {
    const y = e.nativeEvent.locationY;
    const min = Math.floor(((y / HOUR_H) * 60) / 15) * 15;
    newBlockAt(Math.max(0, Math.min(hours * 60 - 30, min)));
  };

  const nextSlot = () => {
    if (day === today) return Math.min(23 * 60, Math.ceil(minutesNow() / 30) * 30);
    const last = list[list.length - 1];
    return last ? Math.min(23 * 60, last.end_min) : 9 * 60;
  };

  const copyYesterday = () => {
    const n = copyDay(addDays(day, -1), day);
    useFx.getState().info('COPIED FROM YESTERDAY', `${n} ${n === 1 ? 'block' : 'blocks'} added to this day.`);
  };

  const layout = useMemo(() => layoutColumns(list), [list]);
  const isToday = day === today;
  const nowMin = minutesNow();

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: 30 }}>
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
              {isToday ? 'PLAN' : relativeLabel(day, today)}
              <Text style={{ color: accent }}>.</Text>
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {/* LIST ↔ TIMELINE */}
            <View style={{ flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border }}>
              {(
                [
                  { v: 'list', icon: 'list' },
                  { v: 'timeline', icon: 'time-outline' },
                ] as const
              ).map((o) => (
                <Pressable
                  key={o.v}
                  onPress={() => {
                    haptic.tap();
                    setSettings({ planView: o.v });
                  }}
                  accessibilityLabel={o.v === 'list' ? 'List view' : 'Timeline view'}
                  style={{ width: 34, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: view === o.v ? c.surface : 'transparent' }}
                >
                  <Ionicons name={o.icon} size={17} color={view === o.v ? c.text : c.textFaint} />
                </Pressable>
              ))}
            </View>
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

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
          <Txt variant="small" color={c.textDim} style={{ flex: 1 }}>
            {list.length ? `${list.length} ${list.length === 1 ? 'block' : 'blocks'} · ${fmtDuration(totalMin).toLowerCase()} planned` : 'Nothing planned for this day yet.'}
          </Txt>
          <Press onPress={() => setImporting(true)} tapHaptic hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="document-text-outline" size={14} color={accent} />
            <Txt variant="label" color={accent}>
              WRITE PLAN
            </Txt>
          </Press>
        </View>

        {list.length === 0 ? (
          <Animated.View
            entering={FadeIn}
            style={{ marginTop: 6, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 10 }}
          >
            <Txt variant="small" color={c.text}>
              {view === 'list'
                ? 'Write your day like in your notes — “10:30 - 12:30 Wake up” — or paste a whole plan.'
                : 'Tap any hour on the timeline below to add a block.'}
            </Txt>
            <Button label="WRITE / PASTE A PLAN" icon="document-text-outline" small onPress={() => setImporting(true)} />
            {yesterdayCount ? (
              <Button label={`COPY YESTERDAY'S PLAN (${yesterdayCount})`} icon="copy-outline" variant="outline" small onPress={copyYesterday} />
            ) : null}
          </Animated.View>
        ) : null}
      </View>

      {view === 'list' ? (
        <ScrollView
          style={{ flex: 1, marginTop: 6, borderTopWidth: 1, borderTopColor: c.border }}
          contentContainerStyle={{ padding: 16, paddingTop: 14, paddingBottom: TAB_BAR_SPACE }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <PlanAgenda day={day} list={list} isToday={isToday} nowMin={nowMin} onNewAt={newBlockAt} />
        </ScrollView>
      ) : (
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, marginTop: 6, borderTopWidth: 1, borderTopColor: c.border }}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: TAB_BAR_SPACE }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: hours * HOUR_H, marginHorizontal: 16 }}>
          {/* Hour grid */}
          {Array.from({ length: hours + 1 }, (_, h) => (
            <View key={h} pointerEvents="none" style={{ position: 'absolute', top: h * HOUR_H, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: GUTTER - 10, fontFamily: fonts.mono, fontSize: 10.5, color: c.textFaint, marginTop: -1 }}>
                {h < hours ? fmtMin(h * 60) : ''}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: h < hours ? (h === 24 ? c.borderStrong : c.border) : 'transparent' }} />
            </View>
          ))}
          {/* Tap area to create */}
          <Pressable onPress={onGridPress} style={{ position: 'absolute', top: 0, bottom: 0, left: GUTTER - 10, right: 0 }} />

          {/* Blocks */}
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: GUTTER - 6, right: 0, zIndex: 2 }}>
            {list.map((b) => (
              <BlockCard key={b.id} block={b} col={layout[b.id]?.col ?? 0} cols={layout[b.id]?.cols ?? 1} />
            ))}
          </View>

          {/* Now line */}
          {isToday ? (
            <View pointerEvents="none" style={{ position: 'absolute', top: (nowMin / 60) * HOUR_H - 1, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 3 }}>
              <View style={{ width: GUTTER - 12, height: 18, borderRadius: 5, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: onAccent }}>{fmtMin(nowMin)}</Text>
              </View>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent, marginLeft: 2 }} />
              <View style={{ flex: 1, height: 2, backgroundColor: accent }} />
            </View>
          ) : null}
        </View>

      </ScrollView>
      )}
      {importing ? <PlanImport day={day} existing={list.length} onClose={() => setImporting(false)} /> : null}
    </Screen>
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
      onLongPress={() => openBlockMenu(block, accent)}
      delayLongPress={300}
      style={{
        position: 'absolute',
        top: top + 1,
        height: height - 2,
        left: `${(col / cols) * 100}%`,
        width: `${100 / cols}%`,
        paddingRight: 3,
      }}
    >
      {/* opaque base so the hour lines don't show through the tinted card */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 3, borderRadius: 10, backgroundColor: c.bg }} />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          borderRadius: 10,
          backgroundColor: alpha(color, isDark ? 0.16 : 0.15),
          borderLeftWidth: 3,
          borderLeftColor: color,
          paddingLeft: 10,
          paddingRight: 8,
          paddingVertical: roomy ? 7 : 3,
          overflow: 'hidden',
        }}
      >
        <View style={{ flex: 1, justifyContent: roomy ? 'flex-start' : 'center' }}>
          <Txt
            variant="title"
            numberOfLines={roomy ? 2 : 1}
            style={{ fontSize: 14, lineHeight: 18 }}
          >
            {block.title || cat.label}
          </Txt>
          {roomy ? (
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.6, color: color, marginTop: 3 }} numberOfLines={1}>
              {fmtMin(block.start_min)}–{fmtMin(block.end_min)} · {cat.label}
            </Text>
          ) : null}
        </View>
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
