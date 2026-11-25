import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DoneToggle } from '@/components/ListBits';
import { Empty, IconBtn, Press, ProgressBar, Screen, ScreenTitle, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { diffDays, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { useData, type Goal } from '@/store/data';
import { alive, goalProgress } from '@/store/selectors';
import { alpha, useTheme } from '@/theme';

/** Goals you're working on. Achieved ones are tucked away at the bottom. */
export default function GoalsScreen() {
  const goals = useData((s) => s.goals);
  const tasks = useData((s) => s.tasks);
  const [showAchieved, setShowAchieved] = useState(false);
  const newGoal = () => router.push({ pathname: '/goal/[id]', params: { id: 'new' } });

  const { active, achieved } = useMemo(() => {
    const list = alive(goals);
    return {
      active: list
        .filter((g) => g.status === 'active')
        .sort((a, b) => (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999') || a.created_at.localeCompare(b.created_at)),
      achieved: list.filter((g) => g.status === 'achieved').sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? '')),
    };
  }, [goals]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }} showsVerticalScrollIndicator={false}>
        <ScreenTitle
          kicker={active.length ? `${active.length} IN PROGRESS` : undefined}
          title="GOALS"
          right={<IconBtn icon="add" accentFill onPress={newGoal} />}
        />

        {active.length === 0 ? (
          <Empty icon="locate-outline" title="NO GOALS YET" text="Pick one thing you want to achieve. Then break it into small steps." action="ADD A GOAL" onAction={newGoal} />
        ) : (
          <View style={{ gap: 12 }}>
            {active.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(i * 50).duration(400)}>
                <GoalCard goal={g} progress={goalProgress(g, tasks)} />
              </Animated.View>
            ))}
          </View>
        )}

        <View style={{ marginTop: 16 }}>
          <DoneToggle count={achieved.length} open={showAchieved} onToggle={() => setShowAchieved((v) => !v)} label="ACHIEVED" />
        </View>
        {showAchieved ? (
          <View style={{ gap: 12 }}>
            {achieved.map((g) => (
              <GoalCard key={g.id} goal={g} progress={goalProgress(g, tasks)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function GoalCard({ goal, progress }: { goal: Goal; progress: { done: number; total: number; progress: number } }) {
  const { c, accent } = useTheme();
  const today = todayKey();
  const achieved = goal.status === 'achieved';

  let line = progress.total ? `${progress.done} of ${progress.total} done` : 'No steps yet';
  let lineColor = c.textDim;
  if (achieved) {
    const k = isoToKey(goal.achieved_at);
    line = k ? `Achieved ${relativeLabel(k, today).toLowerCase()}` : 'Achieved';
  } else if (goal.target_date) {
    const d = diffDays(today, goal.target_date);
    line += d < 0 ? ` · ${-d} days overdue` : d === 0 ? ' · due today' : ` · ${d} days left`;
    if (d < 0) lineColor = c.danger;
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
        opacity: achieved ? 0.8 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Txt variant="h1" style={{ flex: 1, fontSize: 28, lineHeight: 30 }} numberOfLines={2}>
          {goal.title.toUpperCase() || 'UNTITLED GOAL'}
        </Txt>
        {achieved ? (
          <Ionicons name="trophy" size={20} color={accent} />
        ) : (
          <Txt variant="h2" color={accent}>
            {Math.round(progress.progress * 100)}%
          </Txt>
        )}
      </View>
      {!achieved ? <ProgressBar value={progress.progress} style={{ marginTop: 14 }} /> : null}
      <Txt variant="small" color={lineColor} style={{ marginTop: 10 }}>
        {line}
      </Txt>
    </Press>
  );
}
