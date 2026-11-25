import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';

import { DateField, pick, QuickDates } from '@/components/fields';
import { HeaderActions } from '@/components/header';
import { Button, InputRow, ListSection, Row, ScrollScreen, Txt } from '@/components/ui';
import { PRIORITIES } from '@/lib/categories';
import { relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { XP, type Priority } from '@/lib/xp';
import { toggleTask } from '@/store/actions';
import { useData } from '@/store/data';
import { alive } from '@/store/selectors';
import { useTheme } from '@/theme';

export default function TaskEditor() {
  const params = useLocalSearchParams<{ id: string; due?: string; goal?: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.tasks[params.id]));
  const goals = useData((s) => s.goals);
  const { create, patch, remove } = useData.getState();
  const { c } = useTheme();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 2);
  const [due, setDue] = useState<string | null>(
    existing ? existing.due_date : params.due === 'none' ? null : (params.due ?? todayKey()),
  );
  const [goalId, setGoalId] = useState<string | null>(existing?.goal_id ?? params.goal ?? null);

  const goalOptions = useMemo(() => alive(goals).filter((g) => g.status === 'active' || g.id === goalId), [goals, goalId]);
  const goal = goalId ? goals[goalId] : undefined;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const fields = () => ({ title: title.trim(), notes: notes.trim(), priority, due_date: due, goal_id: goalId });

  const save = () => {
    if (!title.trim()) return haptic.warning();
    if (existing) patch('tasks', existing.id, fields());
    else create('tasks', fields());
    haptic.medium();
    close();
  };

  const del = () => {
    if (!existing) return;
    const run = () => {
      remove('tasks', existing.id);
      haptic.warning();
      close();
    };
    if (Platform.OS === 'web') return run();
    Alert.alert('Delete Task?', existing.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const choosePriority = () =>
    pick(
      'Priority',
      ([1, 2, 3] as Priority[]).map((p) => ({ label: `${PRIORITIES[p].name}  ·  +${XP.task[p]} XP`, onPress: () => setPriority(p) })),
    );

  const chooseGoal = () =>
    pick('Goal', [
      { label: 'None', onPress: () => setGoalId(null) },
      ...goalOptions.map((g) => ({ label: g.title || 'Untitled Goal', onPress: () => setGoalId(g.id) })),
    ]);

  if (!isNew && !existing) {
    return (
      <ScrollScreen>
        <Txt variant="title2" center style={{ marginTop: 80 }}>
          Task not found
        </Txt>
      </ScrollScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New Task' : 'Details' }} />
      <HeaderActions
        left={[{ key: 'cancel', label: 'Cancel', onPress: close }]}
        right={[{ key: 'save', label: isNew ? 'Add' : 'Done', variant: 'done', disabled: !title.trim(), onPress: save }]}
      />
      <ScrollScreen contentContainerStyle={{ paddingTop: 12 }}>
        <ListSection>
          <InputRow value={title} onChangeText={setTitle} placeholder="Title" autoFocus={isNew} returnKeyType="done" onSubmitEditing={save} />
          <InputRow value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
        </ListSection>

        <ListSection style={{ marginTop: 22 }} inset={60}>
          <Row
            icon="calendar"
            iconColor={c.red}
            title="Date"
            subtitle={due ? relativeLabel(due) : undefined}
            right={<Switch value={!!due} onValueChange={(on) => setDue(on ? todayKey() : null)} trackColor={{ true: c.green }} />}
          />
          {due ? <Row title="Due" right={<DateField value={due} onChange={setDue} />} /> : null}
          {due ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <QuickDates value={due} onChange={setDue} />
            </View>
          ) : null}
        </ListSection>

        <ListSection style={{ marginTop: 22 }} inset={60}>
          <Row icon="flag" iconColor={c.orange} title="Priority" value={PRIORITIES[priority].name} chevron onPress={choosePriority} />
          <Row
            icon="target"
            iconColor={c.purple}
            title="Goal"
            value={goal && !goal.deleted ? goal.title || 'Untitled' : 'None'}
            chevron
            onPress={goalOptions.length ? chooseGoal : () => router.push({ pathname: '/goals/[id]', params: { id: 'new' } })}
          />
        </ListSection>
        <Txt variant="footnote" color={c.label2} style={{ marginHorizontal: 16, marginTop: 7 }}>
          Completing this task earns {XP.task[priority]} XP.
        </Txt>

        {existing ? (
          <View style={{ marginTop: 28, gap: 10 }}>
            <Button
              label={existing.done ? 'Mark as Incomplete' : 'Mark as Completed'}
              icon={existing.done ? 'undo' : 'checkCircle'}
              variant="tinted"
              onPress={() => {
                if (title.trim()) patch('tasks', existing.id, fields());
                close();
                setTimeout(() => toggleTask(existing.id), 300);
              }}
            />
            <Button label="Delete Task" variant="plain" color={c.red} onPress={del} />
          </View>
        ) : null}
      </ScrollScreen>
    </>
  );
}
