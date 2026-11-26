import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthGrid, MonthHeader, monthCells, shiftMonth, useCellSize } from '@/components/MonthCalendar';
import { SheetHeader } from '@/components/pickers';
import { Card, Section, Txt } from '@/components/ui';
import { fmtMin, isoToKey, niceLabel, parseKey, todayKey, weekday } from '@/lib/date';
import { LEVEL_LABELS, LEVEL_RANGES, levelColor, levelOf, onLevel } from '@/lib/productivity';
import { useData, type Task } from '@/store/data';
import { alive, dayRatio, taskDays, type DayTasks } from '@/store/selectors';
import { fonts, useTheme } from '@/theme';

/**
 * Task history: a month calendar where every day is coloured by how much of that day's list got done
 * (red → amber → light green → green), with done/total on each day. Tap a day to see its tasks.
 */
export default function HistoryScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tasks = useData((s) => s.tasks);
  const today = todayKey();
  const [month, setMonth] = useState(() => today.slice(0, 7)); // YYYY-MM
  const [selected, setSelected] = useState(today);

  const days = useMemo(() => taskDays(tasks, today), [tasks, today]);
  const planned = useMemo(() => {
    const out: Record<string, Task[]> = {};
    for (const t of alive(tasks)) if (!t.done && t.due_date && t.due_date > today) (out[t.due_date] ??= []).push(t);
    return out;
  }, [tasks, today]);

  const cells = monthCells(month);
  const size = useCellSize();

  // Month summary
  let mDone = 0;
  let mTotal = 0;
  let perfect = 0;
  for (const k of cells) {
    const d = k ? days[k] : undefined;
    if (!d || !k || k > today) continue;
    mDone += d.done.length;
    mTotal += d.done.length + d.missed.length;
    if (d.missed.length === 0 && d.done.length) perfect++;
  }

  const isCurrent = month === today.slice(0, 7);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/tasks'));

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader kicker="TASKS" title="HISTORY" onClose={close} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: insets.bottom + 40, gap: 18 }}>
        <MonthHeader month={month} onShift={(n) => setMonth(shiftMonth(month, n))} canNext={!isCurrent} />

        <MonthGrid
          month={month}
          size={size}
          renderDay={(k) => (
            <DayCell
              day={k}
              size={size}
              stats={k <= today ? days[k] : undefined}
              plannedCount={k > today ? (planned[k]?.length ?? 0) : 0}
              isToday={k === today}
              selected={k === selected}
              onPress={() => setSelected(k)}
              isDark={isDark}
            />
          )}
        />

        {/* Legend: colour + range, so the colours are never the only cue */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {LEVEL_LABELS.map((l, i) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: levelColor(i, isDark) }} />
              <Txt variant="small" color={c.textDim} style={{ fontSize: 12 }}>
                {l} <Text style={{ color: c.textFaint }}>{LEVEL_RANGES[i]}</Text>
              </Txt>
            </View>
          ))}
        </View>

        {mTotal ? (
          <Card style={{ flexDirection: 'row', gap: 12 }}>
            <Stat label="THIS MONTH" value={`${Math.round((mDone / mTotal) * 100)}%`} />
            <Stat label="TASKS DONE" value={`${mDone}/${mTotal}`} />
            <Stat label="PERFECT DAYS" value={String(perfect)} />
          </Card>
        ) : null}

        <DayDetail day={selected} today={today} stats={days[selected]} planned={planned[selected] ?? []} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Txt variant="h2">{value}</Txt>
      <Txt variant="label" style={{ fontSize: 8.5 }}>
        {label}
      </Txt>
    </View>
  );
}

function DayCell({
  day,
  size,
  stats,
  plannedCount,
  isToday,
  selected,
  onPress,
  isDark,
}: {
  day: string;
  size: number;
  stats?: DayTasks;
  plannedCount: number;
  isToday: boolean;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const { c, accent } = useTheme();
  const ratio = dayRatio(stats);
  const level = ratio === null ? null : levelOf(ratio);
  const bg = level === null ? c.surface2 : levelColor(level, isDark);
  const fg = level === null ? c.textDim : onLevel(level, isDark);
  const total = stats ? stats.done.length + stats.missed.length : 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${niceLabel(day)}${total ? `: ${stats!.done.length} of ${total} done` : ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: selected ? 2 : isToday ? 1.5 : 0,
        borderColor: selected ? c.text : accent,
      }}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: fg }}>{parseKey(day).getDate()}</Text>
      {total ? (
        <Text style={{ fontFamily: fonts.mono, fontSize: 8.5, color: fg, opacity: 0.85 }}>
          {stats!.done.length}/{total}
        </Text>
      ) : plannedCount ? (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.textDim, marginTop: 3 }} />
      ) : null}
    </Pressable>
  );
}

function DayDetail({ day, today, stats, planned }: { day: string; today: string; stats?: DayTasks; planned: Task[] }) {
  const { c, isDark } = useTheme();
  const ratio = dayRatio(stats);
  const total = stats ? stats.done.length + stats.missed.length : 0;
  const level = ratio === null ? null : levelOf(ratio);
  const isToday = day === today;
  const future = day > today;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt variant="label">{weekday(day)}</Txt>
          <Txt variant="h1" style={{ fontSize: 28, marginTop: 2 }}>
            {niceLabel(day, today).toUpperCase()}
          </Txt>
        </View>
        {level !== null ? (
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: levelColor(level, isDark) }} />
              <Txt variant="h2">{Math.round(ratio! * 100)}%</Txt>
            </View>
            <Txt variant="small" color={c.textDim}>
              {LEVEL_LABELS[level]} · {stats!.done.length} of {total}
            </Txt>
          </View>
        ) : null}
      </View>

      {stats?.done.length ? (
        <View>
          <Section label="DONE" count={stats.done.length} style={{ marginBottom: 8 }} />
          <View style={{ gap: 6 }}>
            {stats.done.map((t) => (
              <HistoryRow key={t.id} task={t} done />
            ))}
          </View>
        </View>
      ) : null}

      {stats?.missed.length ? (
        <View>
          <Section label={isToday ? 'STILL OPEN' : 'NOT DONE'} count={stats.missed.length} style={{ marginBottom: 8 }} />
          <View style={{ gap: 6 }}>
            {stats.missed.map((t) => (
              <HistoryRow key={t.id} task={t} />
            ))}
          </View>
        </View>
      ) : null}

      {future && planned.length ? (
        <View>
          <Section label="PLANNED" count={planned.length} style={{ marginBottom: 8 }} />
          <View style={{ gap: 6 }}>
            {planned.map((t) => (
              <HistoryRow key={t.id} task={t} />
            ))}
          </View>
        </View>
      ) : null}

      {!total && !(future && planned.length) ? (
        <Txt variant="small" color={c.textFaint}>
          {future ? 'Nothing planned for this day yet.' : 'No tasks on this day.'}
        </Txt>
      ) : null}
    </View>
  );
}

function HistoryRow({ task, done = false }: { task: Task; done?: boolean }) {
  const { c, accent } = useTheme();
  const doneDay = isoToKey(task.done_at);
  let hint = '';
  if (done && task.done_at) {
    const d = new Date(task.done_at);
    hint = fmtMin(d.getHours() * 60 + d.getMinutes());
  } else if (task.done && doneDay) hint = `Done ${niceLabel(doneDay).toLowerCase()}`;
  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: pressed ? c.surface2 : c.surface,
        borderWidth: 1,
        borderColor: c.border,
      })}
    >
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? accent : c.textFaint} />
      {task.emoji ? <Text style={{ fontSize: 17 }}>{task.emoji}</Text> : null}
      <Txt variant="body" numberOfLines={1} style={{ flex: 1 }} color={done ? c.text : c.textDim}>
        {task.title || 'Untitled task'}
      </Txt>
      {hint ? (
        <Txt variant="small" color={c.textFaint}>
          {hint}
        </Txt>
      ) : null}
    </Pressable>
  );
}
