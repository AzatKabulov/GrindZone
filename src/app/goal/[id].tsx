import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FxHost } from '@/components/FxHost';
import { PeekHost } from '@/components/TaskPeek';
import { QuickAdd } from '@/components/ListBits';
import { DatePicker, FieldLabel, SheetHeader } from '@/components/pickers';
import { TaskRow } from '@/components/TaskRow';
import { Button, Card, Input, ProgressBar, Section, Txt } from '@/components/ui';
import { addDays, diffDays, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { setGoalAchieved } from '@/store/actions';
import { useData } from '@/store/data';
import { goalProgress, goalTasks } from '@/store/selectors';
import { fonts, useTheme } from '@/theme';

/** A goal = a name, (optionally) why and a deadline, and the steps that get you there. */
export default function GoalScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.goals[params.id]));
  const tasks = useData((s) => s.tasks);
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayKey();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [why, setWhy] = useState(existing?.why ?? '');
  const [target, setTarget] = useState<string | null>(existing?.target_date ?? null);

  const steps = useMemo(() => (existing ? goalTasks(tasks, existing.id) : []), [tasks, existing]);
  const progress = existing ? goalProgress(existing, tasks) : { done: 0, total: 0, progress: 0 };
  const achieved = existing?.status === 'achieved';
  const dirty = !!existing && (title.trim() !== existing.title || why.trim() !== existing.why || target !== existing.target_date);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/goals'));
  const fields = () => ({ title: title.trim(), why: why.trim(), target_date: target });

  const save = () => {
    if (!title.trim()) return haptic.warning();
    if (existing) {
      patch('goals', existing.id, fields());
      haptic.medium();
      close();
    } else {
      const g = create('goals', fields());
      haptic.success();
      router.replace({ pathname: '/goal/[id]', params: { id: g.id } });
    }
  };

  const del = () => {
    if (!existing) return;
    const run = () => {
      remove('goals', existing.id);
      haptic.warning();
      close();
    };
    if (Platform.OS === 'web') return run();
    Alert.alert('Delete goal?', 'Its steps stay in your task list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
        <SheetHeader kicker="GOAL" title="NOT FOUND" onClose={close} />
      </View>
    );
  }

  const daysLeft = target ? diffDays(today, target) : null;
  const status = achieved
    ? 'Achieved'
    : `${progress.done} of ${progress.total} steps done${daysLeft === null ? '' : daysLeft < 0 ? ` · ${-daysLeft} days overdue` : ` · ${daysLeft} days left`}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <SheetHeader kicker={isNew ? 'NEW' : achieved ? 'ACHIEVED' : 'GOAL'} title={isNew ? 'NEW GOAL' : 'GOAL'} onClose={close} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }} keyboardShouldPersistTaps="handled">
          {existing ? (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Txt variant="display" size={34} color={achieved ? accent : c.text}>
                  {Math.round(progress.progress * 100)}%
                </Txt>
                <Txt variant="small" color={daysLeft !== null && daysLeft < 0 && !achieved ? c.danger : c.textDim} style={{ flex: 1, textAlign: 'right' }}>
                  {status}
                </Txt>
              </View>
              <ProgressBar value={progress.progress} />
            </Card>
          ) : null}

          <View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What do you want to achieve?"
              placeholderTextColor={c.textFaint}
              selectionColor={accent}
              autoFocus={isNew}
              multiline
              style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 36, color: c.text, paddingVertical: 4, letterSpacing: 0.5 }}
            />
            <Input value={why} onChangeText={setWhy} placeholder="Why it matters (optional)" multiline style={{ marginTop: 10, minHeight: 60, textAlignVertical: 'top', fontSize: 15 }} />
          </View>

          <View>
            <FieldLabel>DEADLINE</FieldLabel>
            <DatePicker
              value={target}
              onChange={setTarget}
              options={[
                { label: '1 MONTH', v: addDays(today, 30) },
                { label: '3 MONTHS', v: addDays(today, 91) },
                { label: '1 YEAR', v: addDays(today, 365) },
                { label: 'NONE', v: null },
              ]}
            />
          </View>

          {isNew || dirty ? <Button label={isNew ? 'ADD GOAL' : 'SAVE'} icon={isNew ? 'add' : 'checkmark'} onPress={save} disabled={!title.trim()} /> : null}

          {existing ? (
            <View>
              <Section label="STEPS" count={steps.length} style={{ marginBottom: 12 }} />
              <QuickAdd placeholder="Add the next step…" onAdd={(t) => create('tasks', { title: t, goal_id: existing.id, due_date: null })} />
              <View style={{ gap: 8, marginTop: 8 }}>
                {steps.map((t) => (
                  <TaskRow key={t.id} task={t} showGoal={false} />
                ))}
              </View>
              {steps.length === 0 ? (
                <Txt variant="small" color={c.textFaint} style={{ marginTop: 12 }}>
                  Break the goal into small steps. Progress fills up as you finish them.
                </Txt>
              ) : null}
            </View>
          ) : null}

          {existing ? (
            <View style={{ gap: 10 }}>
              <Button
                label={achieved ? 'NOT ACHIEVED YET' : 'MARK AS ACHIEVED'}
                icon={achieved ? 'refresh' : 'trophy'}
                variant={achieved ? 'outline' : 'primary'}
                onPress={() => {
                  if (dirty && title.trim()) patch('goals', existing.id, fields());
                  setGoalAchieved(existing.id, !achieved);
                }}
              />
              <Button label="DELETE GOAL" icon="trash-outline" variant="danger" onPress={del} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <PeekHost />
      <FxHost />
    </View>
  );
}
