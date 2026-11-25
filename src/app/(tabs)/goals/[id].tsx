import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';

import { DateField, pick, QuickDates } from '@/components/fields';
import { HeaderActions } from '@/components/header';
import { QuickAdd } from '@/components/QuickAdd';
import { Rings } from '@/components/Rings';
import { TASK_INSET, TaskRow } from '@/components/TaskRow';
import { Button, InputRow, ListSection, Row, ScrollScreen, SectionHeader, Txt } from '@/components/ui';
import { GOAL_CATEGORIES, GOAL_CATEGORY_KEYS, type GoalCategory } from '@/lib/categories';
import { addDays, diffDays, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { XP } from '@/lib/xp';
import { setGoalAchieved } from '@/store/actions';
import { useData } from '@/store/data';
import { goalProgress, goalTasks } from '@/store/selectors';
import { shade, useTheme } from '@/theme';

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const goal = useData((s) => (isNew ? undefined : s.goals[id]));
  const tasks = useData((s) => s.tasks);
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();

  const [title, setTitle] = useState(goal?.title ?? '');
  const [why, setWhy] = useState(goal?.why ?? '');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'body');
  const [target, setTarget] = useState<string | null>(goal?.target_date ?? null);

  const latest = useRef({ title, why });
  const linked = useMemo(() => (goal ? goalTasks(tasks, goal.id) : []), [tasks, goal]);
  const progress = goal ? goalProgress(goal, tasks) : { done: 0, total: 0, progress: 0 };
  const achieved = goal?.status === 'achieved';
  const cat = GOAL_CATEGORIES[category];
  const color = c[cat.color];

  // Existing goals save as you type (debounced) and when you leave.
  const save = (fields: Partial<{ title: string; why: string; category: GoalCategory; target_date: string | null }>) => {
    if (goal) patch('goals', goal.id, fields);
  };
  useEffect(() => {
    if (!goal) return;
    const t = setTimeout(() => {
      const { title: tt, why: ww } = latest.current;
      if (tt.trim() && (tt.trim() !== goal.title || ww.trim() !== goal.why)) patch('goals', goal.id, { title: tt.trim(), why: ww.trim() });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, why]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/goals'));

  const add = () => {
    if (!title.trim()) return haptic.warning();
    const g = create('goals', { title: title.trim(), why: why.trim(), category, target_date: target });
    haptic.success();
    router.replace({ pathname: '/goals/[id]', params: { id: g.id } });
  };

  const del = () => {
    if (!goal) return;
    const run = () => {
      remove('goals', goal.id);
      haptic.warning();
      back();
    };
    if (Platform.OS === 'web') return run();
    Alert.alert('Delete Goal?', 'Linked tasks stay in your list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const choosePillar = () =>
    pick(
      'Pillar',
      GOAL_CATEGORY_KEYS.map((k) => ({
        label: GOAL_CATEGORIES[k].label,
        onPress: () => {
          setCategory(k);
          save({ category: k });
        },
      })),
    );

  const setDeadline = (v: string | null) => {
    setTarget(v);
    save({ target_date: v });
  };

  if (!isNew && !goal) {
    return (
      <ScrollScreen>
        <Txt variant="title2" center style={{ marginTop: 80 }}>
          Goal not found
        </Txt>
      </ScrollScreen>
    );
  }

  const daysLeft = target ? diffDays(todayKey(), target) : null;

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New Goal' : '' }} />
      <HeaderActions
        right={
          isNew
            ? [{ key: 'add', label: 'Add', variant: 'done', disabled: !title.trim(), onPress: add }]
            : [
                {
                  key: 'more',
                  label: 'More',
                  icon: 'ellipsis',
                  menu: [
                    achieved
                      ? { label: 'Reopen Goal', icon: 'undo', onPress: () => setGoalAchieved(goal!.id, false) }
                      : { label: 'Mark as Achieved', icon: 'trophy', onPress: () => setGoalAchieved(goal!.id, true) },
                    { label: 'Delete Goal', icon: 'trash', destructive: true, onPress: del },
                  ],
                },
              ]
        }
      />
      <ScrollScreen>
        {goal ? (
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 22 }}>
            <Rings size={150} stroke={18} rings={[{ value: progress.progress, colors: [shade(achieved ? c.yellow : color, 0.3), achieved ? c.yellow : color] }]}>
              <Txt design="rounded" weight="700" size={34} tabular>
                {Math.round(progress.progress * 100)}%
              </Txt>
            </Rings>
            <Txt variant="title2" center style={{ marginTop: 16 }} numberOfLines={3}>
              {goal.title || 'Untitled Goal'}
            </Txt>
            <Txt variant="subhead" color={c.label2} center style={{ marginTop: 4 }}>
              {achieved
                ? `Achieved · +${XP.goal} XP`
                : `${progress.done} of ${progress.total} tasks${daysLeft === null ? '' : daysLeft < 0 ? ` · ${-daysLeft} days overdue` : ` · ${daysLeft} days left`}`}
            </Txt>
          </View>
        ) : null}

        <ListSection header={goal ? 'Details' : undefined} style={{ marginTop: goal ? 0 : 8 }}>
          <InputRow
            value={title}
            onChangeText={(v) => {
              latest.current = { ...latest.current, title: v };
              setTitle(v);
            }}
            placeholder="Goal"
            autoFocus={isNew}
            returnKeyType="done"
          />
          <InputRow
            value={why}
            onChangeText={(v) => {
              latest.current = { ...latest.current, why: v };
              setWhy(v);
            }}
            placeholder="Why does it matter? What changes when you get there?"
            multiline
          />
        </ListSection>

        <ListSection style={{ marginTop: 22 }} inset={60}>
          <Row icon={cat.icon} iconColor={color} title="Pillar" value={cat.label} chevron onPress={choosePillar} />
          <Row
            icon="calendar"
            iconColor={c.red}
            title="Deadline"
            subtitle={target ? undefined : 'Goals with a date get done'}
            right={
              <Switch
                value={!!target}
                onValueChange={(on) => setDeadline(on ? addDays(todayKey(), 30) : null)}
                trackColor={{ true: c.green }}
              />
            }
          />
          {target ? <Row title="Date" right={<DateField value={target} onChange={setDeadline} />} /> : null}
          {target ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <QuickDates value={target} onChange={setDeadline} />
            </View>
          ) : null}
        </ListSection>

        {goal ? (
          <View style={{ marginTop: 28 }}>
            <SectionHeader title="Tasks" detail={linked.length ? String(linked.length) : undefined} />
            <ListSection inset={TASK_INSET}>
              {linked.map((t) => (
                <TaskRow key={t.id} task={t} showGoal={false} />
              ))}
              <QuickAdd day={null} goalId={goal.id} placeholder="Next step" />
            </ListSection>
            <Txt variant="footnote" color={c.label2} style={{ marginHorizontal: 16, marginTop: 7 }}>
              Break the goal into concrete tasks. Progress fills as you complete them.
            </Txt>
          </View>
        ) : null}

        {goal ? (
          <View style={{ marginTop: 28, gap: 12 }}>
            <Button
              label={achieved ? 'Reopen Goal' : 'Mark as Achieved'}
              icon={achieved ? 'undo' : 'trophy'}
              variant={achieved ? 'gray' : 'filled'}
              color={achieved ? undefined : accent}
              onPress={() => setGoalAchieved(goal.id, !achieved)}
            />
            <Button label="Delete Goal" variant="plain" color={c.red} onPress={del} />
          </View>
        ) : null}
      </ScrollScreen>
    </>
  );
}
