import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Segmented } from '@/components/fields';
import { HeaderActions } from '@/components/header';
import { MiniRing } from '@/components/Rings';
import { Card, Empty, IconTile, Press, ScrollScreen, Txt } from '@/components/ui';
import { GOAL_CATEGORIES } from '@/lib/categories';
import { diffDays, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { useData, type Goal } from '@/store/data';
import { alive, goalProgress } from '@/store/selectors';
import { useTheme } from '@/theme';

export default function GoalsScreen() {
  const goals = useData((s) => s.goals);
  const tasks = useData((s) => s.tasks);
  const [tab, setTab] = useState(0);

  const { active, achieved } = useMemo(() => {
    const list = alive(goals);
    return {
      active: list
        .filter((g) => g.status === 'active')
        .sort((a, b) => (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999') || a.created_at.localeCompare(b.created_at)),
      achieved: list.filter((g) => g.status === 'achieved').sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? '')),
    };
  }, [goals]);

  const shown = tab === 0 ? active : achieved;
  const add = () => router.push({ pathname: '/goals/[id]', params: { id: 'new' } });

  return (
    <>
      <HeaderActions right={[{ key: 'add', label: 'New Goal', icon: 'plus', onPress: add }]} />
      <ScrollScreen>
        <View style={{ marginTop: 6, marginBottom: 18 }}>
          <Segmented values={[`Active`, `Achieved`]} index={tab} onChange={setTab} />
        </View>
        {shown.length === 0 ? (
          tab === 0 ? (
            <Empty
              icon="target"
              title="No Goals Yet"
              text="Decide what you’re going after. Break it into tasks. Then execute."
              action="Set a Goal"
              onAction={add}
            />
          ) : (
            <Empty icon="trophy" title="Nothing Achieved Yet" text="Achieved goals become your trophy shelf." />
          )
        ) : (
          <View style={{ gap: 12 }}>
            {shown.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(i * 40).duration(380)}>
                <GoalCard goal={g} progress={goalProgress(g, tasks)} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollScreen>
    </>
  );
}

function GoalCard({ goal, progress }: { goal: Goal; progress: { done: number; total: number; progress: number } }) {
  const { c, accent } = useTheme();
  const cat = GOAL_CATEGORIES[goal.category] ?? GOAL_CATEGORIES.mind;
  const color = c[cat.color];
  const today = todayKey();
  const achieved = goal.status === 'achieved';

  let when = 'No deadline';
  let whenColor = c.label2;
  if (achieved) {
    const k = isoToKey(goal.achieved_at);
    const rel = k ? relativeLabel(k, today) : '';
    when = !k ? 'Achieved' : rel === 'Today' || rel === 'Yesterday' ? `Achieved ${rel.toLowerCase()}` : `Achieved ${rel}`;
  } else if (goal.target_date) {
    const d = diffDays(today, goal.target_date);
    when = d < 0 ? `${-d} days overdue` : d === 0 ? 'Due today' : d === 1 ? '1 day left' : `${d} days left`;
    whenColor = d < 0 ? c.red : d <= 7 ? c.orange : c.label2;
  }
  const ready = !achieved && progress.total > 0 && progress.done === progress.total;

  return (
    <Press scaleTo={0.98} onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconTile name={achieved ? 'trophy' : cat.icon} color={achieved ? c.yellow : color} size={36} />
          <View style={{ flex: 1 }}>
            <Txt variant="headline" numberOfLines={2}>
              {goal.title || 'Untitled Goal'}
            </Txt>
            <Txt variant="footnote" color={c.label2}>
              {cat.label}
              <Txt variant="footnote" color={whenColor}>
                {'  ·  '}
                {when}
              </Txt>
            </Txt>
          </View>
          <MiniRing value={progress.progress} size={50} stroke={6} color={achieved ? c.yellow : color}>
            <Txt variant="caption2" design="rounded" weight="700" tabular>
              {Math.round(progress.progress * 100)}%
            </Txt>
          </MiniRing>
        </View>
        {goal.why ? (
          <Txt variant="subhead" color={c.label2} numberOfLines={2} style={{ marginTop: 12 }}>
            {goal.why}
          </Txt>
        ) : null}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Txt variant="footnote" color={c.label2} style={{ flex: 1 }}>
            {progress.total ? `${progress.done} of ${progress.total} tasks done` : 'No tasks linked yet'}
          </Txt>
          {ready ? (
            <Txt variant="footnote" weight="600" color={accent}>
              Ready to achieve
            </Txt>
          ) : null}
        </View>
      </Card>
    </Press>
  );
}
