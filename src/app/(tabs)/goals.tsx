import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Chip, Empty, IconBtn, Press, ProgressBar, Screen, ScreenTitle, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { GOAL_CATEGORIES } from '@/lib/categories';
import { diffDays, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { useData, type Goal } from '@/store/data';
import { alive, goalProgress } from '@/store/selectors';
import { alpha, useTheme } from '@/theme';

export default function GoalsScreen() {
  const goals = useData((s) => s.goals);
  const tasks = useData((s) => s.tasks);
  const [tab, setTab] = useState<'active' | 'achieved'>('active');

  const { active, achieved } = useMemo(() => {
    const list = alive(goals);
    return {
      active: list
        .filter((g) => g.status === 'active')
        .sort((a, b) => (a.target_date ?? '9999') .localeCompare(b.target_date ?? '9999') || a.created_at.localeCompare(b.created_at)),
      achieved: list
        .filter((g) => g.status === 'achieved')
        .sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? '')),
    };
  }, [goals]);

  const shown = tab === 'active' ? active : achieved;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }} showsVerticalScrollIndicator={false}>
        <ScreenTitle
          kicker={`${active.length} IN PROGRESS · ${achieved.length} CRUSHED`}
          title="GOALS"
          right={<IconBtn icon="add" accentFill onPress={() => router.push({ pathname: '/goal/[id]', params: { id: 'new' } })} />}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          <Chip label={`ACTIVE · ${active.length}`} active={tab === 'active'} onPress={() => setTab('active')} />
          <Chip label={`CRUSHED · ${achieved.length}`} active={tab === 'achieved'} onPress={() => setTab('achieved')} />
        </View>

        {shown.length === 0 ? (
          tab === 'active' ? (
            <Empty
              icon="locate-outline"
              title="NO TARGETS LOCKED"
              text="A man without a goal is just drifting. Define what you're going after."
              action="SET A GOAL"
              onAction={() => router.push({ pathname: '/goal/[id]', params: { id: 'new' } })}
            />
          ) : (
            <Empty icon="trophy-outline" title="NOTHING CRUSHED YET" text="Achieved goals become your trophy wall." />
          )
        ) : (
          <View style={{ gap: 12 }}>
            {shown.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(i * 50).duration(400)}>
                <GoalCard goal={g} progress={goalProgress(g, tasks)} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function GoalCard({ goal, progress }: { goal: Goal; progress: { done: number; total: number; progress: number } }) {
  const { c, accent } = useTheme();
  const cat = GOAL_CATEGORIES[goal.category] ?? GOAL_CATEGORIES.mind;
  const today = todayKey();
  const achieved = goal.status === 'achieved';
  let deadline = 'NO DEADLINE';
  let deadlineColor = c.textFaint;
  if (achieved) {
    const k = isoToKey(goal.achieved_at);
    deadline = k ? `CRUSHED ${relativeLabel(k, today)}` : 'CRUSHED';
    deadlineColor = accent;
  } else if (goal.target_date) {
    const d = diffDays(today, goal.target_date);
    deadline = d < 0 ? `${-d}D OVERDUE` : d === 0 ? 'DUE TODAY' : `${d} DAYS LEFT`;
    deadlineColor = d < 0 ? c.danger : d <= 7 ? accent : c.textDim;
  }

  return (
    <Press
      scaleTo={0.985}
      onPress={() => router.push({ pathname: '/goal/[id]', params: { id: goal.id } })}
      style={{
        padding: 18,
        borderRadius: 18,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: achieved ? alpha(accent, 0.4) : c.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: alpha(accent, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={achieved ? 'trophy' : cat.icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="label">{cat.label}</Txt>
          <Txt variant="label" color={deadlineColor} style={{ marginTop: 3 }}>
            {deadline}
          </Txt>
        </View>
        <Txt variant="display" style={{ fontSize: 34, lineHeight: 36 }} color={achieved ? accent : c.text}>
          {Math.round(progress.progress * 100)}
          <Txt variant="h2" color={c.textDim} style={{ fontSize: 18 }}>
            %
          </Txt>
        </Txt>
      </View>
      <Txt variant="h1" style={{ marginTop: 14, fontSize: 28, lineHeight: 30 }} numberOfLines={2}>
        {goal.title.toUpperCase() || 'UNTITLED GOAL'}
      </Txt>
      {goal.why ? (
        <Txt variant="small" color={c.textDim} numberOfLines={2} style={{ marginTop: 6 }}>
          {goal.why}
        </Txt>
      ) : null}
      <ProgressBar value={progress.progress} style={{ marginTop: 16 }} />
      <Txt variant="label" style={{ marginTop: 8 }}>
        {progress.total ? `${progress.done}/${progress.total} MISSIONS COMPLETE` : 'NO MISSIONS LINKED YET'}
      </Txt>
    </Press>
  );
}
