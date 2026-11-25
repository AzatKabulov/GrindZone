import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/pickers';
import { Card, Empty, Section, Txt } from '@/components/ui';
import { addDays, dayNum, monthShort, todayKey, weekday } from '@/lib/date';
import { useData } from '@/store/data';
import { deltaPts, habitRate, habitStart, habitsStats, type Rate, type WeekStat } from '@/store/habitStats';
import { alpha, fonts, useTheme } from '@/theme';

const WEEKS = 12;
const CHART_H = 132;
const WEEKDAY = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const pct = (r: Rate | null | undefined) => (r && r.rate !== null ? `${Math.round(r.rate * 100)}%` : '—');
const weekLabel = (start: string) => `${dayNum(start)}–${dayNum(addDays(start, 6))} ${monthShort(addDays(start, 6))}`;

/**
 * Habit analytics: how consistent you are this week, how that's trending week by week, which days of
 * the week you're strongest, and how each habit is doing. Tap a week in the chart for its full report.
 */
export default function HabitStatsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const habitsById = useData((s) => s.habits);
  const today = todayKey();
  const stats = useMemo(() => habitsStats(habitsById, today, WEEKS), [habitsById, today]);
  const [selected, setSelected] = useState(stats.weekly.length - 1);
  const week = stats.weekly[Math.min(selected, stats.weekly.length - 1)];
  const prevWeek = stats.weekly[Math.min(selected, stats.weekly.length - 1) - 1];
  const close = () => (router.canGoBack() ? router.back() : router.replace('/habits'));

  const ranked = stats.weekdays.map((r, i) => ({ i, r })).filter((x) => x.r.rate !== null);
  const strongest = ranked.length ? ranked.reduce((a, b) => (b.r.rate! > a.r.rate! ? b : a)) : null;
  const weakest = ranked.length ? ranked.reduce((a, b) => (b.r.rate! < a.r.rate! ? b : a)) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader kicker="HABITS" title="ANALYTICS" onClose={close} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: insets.bottom + 40, gap: 26 }}>
        {stats.habits.length === 0 ? (
          <Empty icon="stats-chart-outline" title="NO DATA YET" text="Add a habit and check it off for a few days. Your weekly reports show up here." />
        ) : (
          <>
            {/* Headline numbers */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Tile label="THIS WEEK" value={pct(stats.thisWeek)} delta={deltaPts(stats.thisWeek, stats.lastWeek)} vs="vs last week" />
              <Tile label="LAST 4 WEEKS" value={pct(stats.last4)} delta={deltaPts(stats.last4, stats.prev4)} vs="vs 4 weeks before" />
            </View>

            {/* Weekly trend */}
            <View>
              <Section label="WEEK BY WEEK" style={{ marginBottom: 4 }} />
              <Txt variant="small" color={c.textDim} style={{ marginBottom: 14 }}>
                Share of habit-days done each week · tap a week for its report
              </Txt>
              <WeekChart weeks={stats.weekly} selected={selected} onSelect={setSelected} />
            </View>

            {/* Report for the selected week */}
            <WeekReport week={week} prev={prevWeek} today={today} />

            {/* Day of week */}
            <View>
              <Section label="BY DAY OF THE WEEK" style={{ marginBottom: 4 }} />
              <Txt variant="small" color={c.textDim} style={{ marginBottom: 14 }}>
                Last {WEEKS} weeks
                {strongest && weakest && strongest.i !== weakest.i
                  ? ` · strongest ${WEEKDAY[strongest.i].toLowerCase()} (${pct(strongest.r)}), weakest ${WEEKDAY[weakest.i].toLowerCase()} (${pct(weakest.r)})`
                  : ''}
              </Txt>
              <DayChart days={stats.weekdays} best={strongest?.i ?? -1} />
            </View>

            {/* Per habit */}
            <View>
              <Section label="EACH HABIT" style={{ marginBottom: 4 }} />
              <Txt variant="small" color={c.textDim} style={{ marginBottom: 14 }}>
                Last 4 weeks · arrow = change vs the 4 weeks before
              </Txt>
              <View style={{ gap: 16 }}>
                {stats.perHabit.map((s) => (
                  <Pressable key={s.habit.id} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: s.habit.id } })}>
                    <HabitBar
                      emoji={s.habit.emoji}
                      title={s.habit.title || 'Untitled habit'}
                      rate={s.last4}
                      delta={deltaPts(s.last4, s.prev4)}
                      meta={`${s.streak}-day streak · best ${s.best} · this week ${s.week.done}/${s.week.possible}`}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Delta({ value, vs }: { value: number | null; vs?: string }) {
  const { c, accent } = useTheme();
  if (value === null) return <Txt variant="small" color={c.textFaint}>{vs ? `no data ${vs}` : ''}</Txt>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name={flat ? 'remove' : up ? 'arrow-up' : 'arrow-down'} size={12} color={flat ? c.textDim : up ? accent : c.danger} />
      <Txt variant="small" color={c.textDim} style={{ fontSize: 12 }}>
        {flat ? 'same' : `${up ? '+' : ''}${value} pts`}
        {vs ? ` ${vs}` : ''}
      </Txt>
    </View>
  );
}

function Tile({ label, value, delta, vs }: { label: string; value: string; delta: number | null; vs: string }) {
  return (
    <Card style={{ flex: 1, gap: 6, padding: 16 }}>
      <Txt variant="label" style={{ fontSize: 9 }}>
        {label}
      </Txt>
      <Txt variant="display" size={40}>
        {value}
      </Txt>
      <Delta value={delta} vs={vs} />
    </Card>
  );
}

/** Column chart, one column per week (single series, so no legend: the section title names it). */
function WeekChart({ weeks, selected, onSelect }: { weeks: WeekStat[]; selected: number; onSelect: (i: number) => void }) {
  const { c, accent } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {/* y axis */}
        <View style={{ width: 34, height: CHART_H, justifyContent: 'space-between' }}>
          {['100%', '50%', '0%'].map((t) => (
            <Text key={t} style={{ fontFamily: fonts.mono, fontSize: 9, color: c.textFaint, marginTop: t === '100%' ? -6 : 0, marginBottom: t === '0%' ? -6 : 0 }}>
              {t}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, height: CHART_H }}>
          {/* recessive hairline grid */}
          {[0, 0.5, 1].map((g) => (
            <View key={g} style={{ position: 'absolute', left: 0, right: 0, top: CHART_H * (1 - g), height: 1, backgroundColor: c.border }} />
          ))}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
            {weeks.map((w, i) => {
              const on = i === selected;
              const h = w.rate === null ? 0 : Math.max(3, w.rate * CHART_H);
              return (
                <Pressable
                  key={w.start}
                  onPress={() => onSelect(i)}
                  accessibilityLabel={`Week of ${weekLabel(w.start)}: ${pct(w)}`}
                  style={{ flex: 1, height: CHART_H, alignItems: 'center', justifyContent: 'flex-end' }}
                >
                  {on ? (
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: c.text, marginBottom: 4 }}>{pct(w)}</Text>
                  ) : null}
                  <View
                    style={{
                      width: '62%',
                      maxWidth: 22,
                      height: h,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      backgroundColor: on ? accent : alpha(accent, 0.38),
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginLeft: 34, marginTop: 6 }}>
        {weeks.map((w, i) => (
          <Text
            key={w.start}
            style={{ flex: 1, textAlign: 'center', fontFamily: fonts.mono, fontSize: 8, color: i === selected ? c.text : c.textFaint }}
            numberOfLines={1}
          >
            {i % 3 === (weeks.length - 1) % 3 || i === selected ? `${dayNum(w.start)}/${parseInt(w.start.slice(5, 7), 10)}` : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** The selected week as a report: rate, change, and every habit × every day. */
function WeekReport({ week, prev, today }: { week: WeekStat; prev?: WeekStat; today: string }) {
  const { c, accent } = useTheme();
  const habits = useData((s) => s.habits);
  const list = Object.values(habits)
    .filter((h) => !h.deleted && habitStart(h) <= addDays(week.start, 6))
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.start, i));
  const current = week.start === days[0] && today >= week.start && today <= days[6];

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="label">{current ? 'THIS WEEK' : 'WEEK REPORT'}</Txt>
          <Txt variant="h2">{weekLabel(week.start)}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Txt variant="h1" style={{ fontSize: 30 }}>
            {pct(week)}
          </Txt>
          <Delta value={deltaPts(week, prev)} />
        </View>
      </View>
      <Txt variant="small" color={c.textDim}>
        {week.done} of {week.possible} habit-days done{current ? ' so far' : ''}
      </Txt>

      {list.length ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }} />
            {days.map((d) => (
              <Text key={d} style={{ width: 24, textAlign: 'center', fontFamily: fonts.mono, fontSize: 8.5, color: d === today ? c.text : c.textFaint }}>
                {weekday(d).charAt(0)}
              </Text>
            ))}
            <View style={{ width: 40 }} />
          </View>
          {list.map((h) => {
            const checks = new Set(h.checks ?? []);
            const start = habitStart(h);
            const r = habitRate(h, week.start, days[6], today);
            return (
              <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Txt variant="small" numberOfLines={1} style={{ flex: 1, paddingRight: 8 }}>
                  {h.emoji ? `${h.emoji} ` : ''}
                  {h.title || 'Untitled'}
                </Txt>
                {days.map((d) => {
                  const on = checks.has(d);
                  const counts = d >= start && (d < today || (d === today && on));
                  return (
                    <View key={d} style={{ width: 24, alignItems: 'center' }}>
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          backgroundColor: on ? accent : 'transparent',
                          borderWidth: on ? 0 : 1.5,
                          borderColor: counts ? c.borderStrong : c.border,
                          opacity: counts || on ? 1 : 0.4,
                        }}
                      />
                    </View>
                  );
                })}
                <Text style={{ width: 40, textAlign: 'right', fontFamily: fonts.mono, fontSize: 11, color: c.textDim }}>{pct(r)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

/** Seven columns, Monday first; the strongest day is the one in full accent. */
function DayChart({ days, best }: { days: Rate[]; best: number }) {
  const { c, accent } = useTheme();
  const H = 96;
  return (
    <View>
      <View style={{ height: H, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: c.border }} />
        {days.map((r, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: H }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 9.5, color: i === best ? c.text : c.textDim, marginBottom: 4 }}>{pct(r)}</Text>
            <View
              style={{
                width: 22,
                height: r.rate === null ? 0 : Math.max(3, r.rate * (H - 18)),
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: i === best ? accent : alpha(accent, 0.38),
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {WEEKDAY.map((d, i) => (
          <Text key={d} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.mono, fontSize: 9, color: i === best ? c.text : c.textFaint }}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** One habit as a horizontal bar (last 4 weeks), value at the tip, trend next to it. */
function HabitBar({ emoji, title, rate, delta, meta }: { emoji: string; title: string; rate: Rate; delta: number | null; meta: string }) {
  const { c, accent } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
        <Txt variant="title" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Txt>
        <Delta value={delta} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.surface3, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round((rate.rate ?? 0) * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: accent }} />
        </View>
        <Text style={{ width: 40, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 13, color: c.text }}>{pct(rate)}</Text>
      </View>
      <Txt variant="small" color={c.textFaint} style={{ fontSize: 12 }}>
        {meta}
      </Txt>
    </View>
  );
}
