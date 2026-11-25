import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FxHost } from '@/components/FxHost';
import { DatePicker, FieldLabel, SheetHeader } from '@/components/pickers';
import { Subtasks } from '@/components/Subtasks';
import { Button, Card, Input, ProgressBar, Section, Txt } from '@/components/ui';
import { addDays, diffDays, nowIso, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { addGoalStep, removeGoalStep, setGoalAchieved, toggleGoalStep } from '@/store/actions';
import { uuid, useData, type GoalStep } from '@/store/data';
import { goalProgress } from '@/store/selectors';
import { fonts, useTheme } from '@/theme';

/** A goal = a name, (optionally) why and a deadline, and its own checklist of steps (steps are not tasks). */
export default function GoalScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.goals[params.id]));
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayKey();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [why, setWhy] = useState(existing?.why ?? '');
  const [target, setTarget] = useState<string | null>(existing?.target_date ?? null);

  // Steps for a goal that isn't saved yet are kept here and saved with it.
  const [draftSteps, setDraftSteps] = useState<GoalStep[]>([]);
  const steps = useMemo(() => (existing ? (existing.steps ?? []) : draftSteps), [existing, draftSteps]);
  const progress = existing ? goalProgress(existing) : { done: 0, total: 0, progress: 0 };
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
      const g = create('goals', { ...fields(), steps: draftSteps });
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
    Alert.alert('Delete goal?', 'The goal and its steps will be deleted.', [
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
      <View style={{ flex: 1 }}>
        <SheetHeader kicker={isNew ? 'NEW' : achieved ? 'ACHIEVED' : 'GOAL'} title={isNew ? 'NEW GOAL' : 'GOAL'} onClose={close} />
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive" contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }} keyboardShouldPersistTaps="handled">
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

          <View>
            <Section label="STEPS" count={steps.length ? `${steps.filter((x) => x.done).length}/${steps.length}` : undefined} style={{ marginBottom: 8 }} />
            <Subtasks
              items={steps}
              placeholder={steps.length ? 'Add the next step…' : 'Add a first step…'}
              onToggle={(id) =>
                existing
                  ? toggleGoalStep(existing.id, id)
                  : setDraftSteps((l) => l.map((x) => (x.id === id ? { ...x, done: !x.done, done_at: x.done ? null : nowIso() } : x)))
              }
              onRemove={(id) => (existing ? removeGoalStep(existing.id, id) : setDraftSteps((l) => l.filter((x) => x.id !== id)))}
              onAdd={(t) => (existing ? addGoalStep(existing.id, t) : setDraftSteps((l) => [...l, { id: uuid(), title: t, done: false, done_at: null }]))}
            />
            {steps.length === 0 ? (
              <Txt variant="small" color={c.textFaint} style={{ marginTop: 6 }}>
                Break the goal into small steps. Progress fills up as you tick them off.
              </Txt>
            ) : null}
          </View>

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
      </View>
      <FxHost inSheet />
    </View>
  );
}
