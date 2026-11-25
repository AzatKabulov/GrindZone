import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/pickers';
import { Card, Empty, Press, Txt } from '@/components/ui';
import { dayNum, diffDays, isoToKey, monthShort, todayKey } from '@/lib/date';
import { useData, type Goal } from '@/store/data';
import { alive } from '@/store/selectors';
import { alpha, useTheme } from '@/theme';

/** Every goal you've achieved: when, how long it took, whether it beat the deadline, its steps and why. */
export default function GoalsHistoryScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const goals = useData((s) => s.goals);
  const today = todayKey();

  const { list, thisYear, avgDays, onTime, withDeadline } = useMemo(() => {
    const list = alive(goals)
      .filter((g) => g.status === 'achieved')
      .sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? ''));
    const year = today.slice(0, 4);
    const spans = list.map((g) => took(g)).filter((n): n is number => n !== null);
    const dated = list.filter((g) => g.target_date && g.achieved_at);
    return {
      list,
      thisYear: list.filter((g) => (isoToKey(g.achieved_at) ?? '').startsWith(year)).length,
      avgDays: spans.length ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length) : null,
      onTime: dated.filter((g) => (isoToKey(g.achieved_at) ?? '') <= g.target_date!).length,
      withDeadline: dated.length,
    };
  }, [goals, today]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/goals'));

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader kicker="GOALS" title="ACHIEVED" onClose={close} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: insets.bottom + 40, gap: 14 }}>
        {list.length === 0 ? (
          <Empty icon="trophy-outline" title="NOTHING HERE YET" text="When you mark a goal as achieved it lands here, with how long it took and how it went." />
        ) : (
          <>
            <Card style={{ flexDirection: 'row', gap: 12 }}>
              <Stat label="ACHIEVED" value={String(list.length)} />
              <Stat label="THIS YEAR" value={String(thisYear)} />
              <Stat label="AVG TIME" value={avgDays === null ? '—' : `${avgDays}D`} />
              {withDeadline ? <Stat label="ON TIME" value={`${onTime}/${withDeadline}`} /> : null}
            </Card>
            {list.map((g) => (
              <AchievedCard key={g.id} goal={g} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Days from creating the goal to achieving it. */
function took(g: Goal): number | null {
  const a = isoToKey(g.created_at);
  const b = isoToKey(g.achieved_at);
  return a && b ? Math.max(0, diffDays(a, b)) : null;
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

function AchievedCard({ goal }: { goal: Goal }) {
  const { c, accent } = useTheme();
  const day = isoToKey(goal.achieved_at);
  const days = took(goal);
  const steps = goal.steps ?? [];
  const facts: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; tone?: string }[] = [];
  if (days !== null) facts.push({ icon: 'hourglass-outline', text: days === 0 ? 'Done the same day' : `Took ${days} ${days === 1 ? 'day' : 'days'}` });
  if (goal.target_date && day) {
    const diff = diffDays(goal.target_date, day);
    facts.push(
      diff <= 0
        ? { icon: 'flag-outline', text: diff === 0 ? 'Right on the deadline' : `${-diff} days before the deadline`, tone: accent }
        : { icon: 'flag-outline', text: `${diff} days after the deadline`, tone: c.danger },
    );
  }
  if (steps.length) facts.push({ icon: 'list-outline', text: `${steps.filter((x) => x.done).length} of ${steps.length} steps` });

  return (
    <Press
      scaleTo={0.985}
      onPress={() => router.push({ pathname: '/goal/[id]', params: { id: goal.id } })}
      style={{ padding: 18, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: alpha(accent, 0.35), gap: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="label" color={accent}>
            {day ? `ACHIEVED ${dayNum(day)} ${monthShort(day)} ${day.slice(0, 4)}` : 'ACHIEVED'}
          </Txt>
          <Txt variant="h1" style={{ fontSize: 26, lineHeight: 28 }} numberOfLines={3}>
            {goal.title.toUpperCase() || 'UNTITLED GOAL'}
          </Txt>
        </View>
        <Ionicons name="trophy" size={22} color={accent} />
      </View>
      {goal.why ? (
        <Txt variant="small" color={c.textDim} style={{ lineHeight: 19 }}>
          “{goal.why}”
        </Txt>
      ) : null}
      {facts.length ? (
        <View style={{ gap: 5 }}>
          {facts.map((f) => (
            <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Ionicons name={f.icon} size={14} color={f.tone ?? c.textDim} />
              <Txt variant="small" color={c.textDim}>
                {f.text}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
    </Press>
  );
}
