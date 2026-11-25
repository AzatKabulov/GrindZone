import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FxHost } from '@/components/FxHost';
import { DatePicker, FieldLabel, SheetHeader } from '@/components/pickers';
import { ProgressRing } from '@/components/ProgressRing';
import { TaskRow } from '@/components/TaskRow';
import { Button, Chip, Input, Press, Section, Txt } from '@/components/ui';
import { GOAL_CATEGORIES, GOAL_CATEGORY_KEYS, type GoalCategory } from '@/lib/categories';
import { diffDays, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { XP } from '@/lib/xp';
import { setGoalAchieved } from '@/store/actions';
import { useData } from '@/store/data';
import { goalProgress, goalTasks } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';

export default function GoalScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.goals[params.id]));
  const tasks = useData((s) => s.tasks);
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [why, setWhy] = useState(existing?.why ?? '');
  const [category, setCategory] = useState<GoalCategory>(existing?.category ?? 'body');
  const [target, setTarget] = useState<string | null>(existing?.target_date ?? null);
  const [quick, setQuick] = useState('');

  const linked = useMemo(() => (existing ? goalTasks(tasks, existing.id) : []), [tasks, existing]);
  const progress = existing ? goalProgress(existing, tasks) : { done: 0, total: 0, progress: 0 };
  const achieved = existing?.status === 'achieved';
  const dirty =
    !!existing &&
    (title.trim() !== existing.title || why.trim() !== existing.why || category !== existing.category || target !== existing.target_date);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/goals'));

  const fields = () => ({ title: title.trim(), why: why.trim(), category, target_date: target });

  const save = () => {
    if (!title.trim()) {
      haptic.warning();
      return;
    }
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

  const addMission = () => {
    const t = quick.trim();
    if (!t || !existing) return;
    create('tasks', { title: t, goal_id: existing.id, due_date: null });
    haptic.medium();
    setQuick('');
  };

  const del = () => {
    if (!existing) return;
    const run = () => {
      remove('goals', existing.id);
      haptic.warning();
      close();
    };
    if (Platform.OS === 'web') return run();
    Alert.alert('Delete goal?', 'Linked missions stay, they just lose the link.', [
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

  const daysLeft = target ? diffDays(todayKey(), target) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <SheetHeader
          kicker={isNew ? 'NEW GOAL' : achieved ? 'GOAL CRUSHED' : 'GOAL'}
          title={isNew ? 'DEFINE THE TARGET' : 'MISSION CONTROL'}
          onClose={close}
        />
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {existing ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
                padding: 16,
                borderRadius: 18,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: achieved ? alpha(accent, 0.45) : c.border,
              }}
            >
              <ProgressRing value={progress.progress} size={92} stroke={8}>
                <Txt variant="display" style={{ fontSize: 30, lineHeight: 32, marginTop: 3 }}>
                  {Math.round(progress.progress * 100)}%
                </Txt>
              </ProgressRing>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt variant="label">{achieved ? 'STATUS' : 'MISSIONS'}</Txt>
                <Txt variant="h1" color={achieved ? accent : c.text}>
                  {achieved ? 'CRUSHED' : `${progress.done} / ${progress.total}`}
                </Txt>
                <Txt variant="label" color={daysLeft !== null && daysLeft < 0 && !achieved ? c.danger : c.textDim}>
                  {achieved
                    ? `+${XP.goal} XP EARNED`
                    : daysLeft === null
                      ? 'NO DEADLINE'
                      : daysLeft < 0
                        ? `${-daysLeft} DAYS OVERDUE`
                        : `${daysLeft} DAYS LEFT`}
                </Txt>
              </View>
            </View>
          ) : null}

          <View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Name the goal"
              placeholderTextColor={c.textFaint}
              selectionColor={accent}
              autoFocus={isNew}
              multiline
              style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 38, color: c.text, paddingVertical: 4, letterSpacing: 0.5 }}
            />
            <Input
              value={why}
              onChangeText={setWhy}
              placeholder="Why does this matter? What changes when you get it?"
              multiline
              style={{ marginTop: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 15 }}
            />
          </View>

          <View>
            <FieldLabel>PILLAR</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_CATEGORY_KEYS.map((k) => (
                <Chip
                  key={k}
                  label={GOAL_CATEGORIES[k].label}
                  icon={GOAL_CATEGORIES[k].icon}
                  active={category === k}
                  onPress={() => setCategory(k)}
                />
              ))}
            </View>
          </View>

          <View>
            <FieldLabel>DEADLINE</FieldLabel>
            <DatePicker value={target} onChange={setTarget} noneLabel="NO DEADLINE" />
          </View>

          {isNew || dirty ? (
            <Button label={isNew ? 'LOCK IN THE GOAL' : 'SAVE CHANGES'} icon="locate" onPress={save} disabled={!title.trim()} />
          ) : null}

          {existing ? (
            <View>
              <Section label="LINKED MISSIONS" count={linked.length} style={{ marginBottom: 12 }} />
              <View style={{ gap: 8 }}>
                {linked.map((t) => (
                  <TaskRow key={t.id} task={t} showGoal={false} compact />
                ))}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 14,
                    height: 50,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: c.borderStrong,
                  }}
                >
                  <Ionicons name="add" size={20} color={accent} />
                  <TextInput
                    value={quick}
                    onChangeText={setQuick}
                    onSubmitEditing={addMission}
                    placeholder="Break it down: next mission…"
                    placeholderTextColor={c.textFaint}
                    selectionColor={accent}
                    returnKeyType="done"
                    submitBehavior="submit"
                    style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.text, height: '100%' }}
                  />
                  {quick.trim() ? (
                    <Press onPress={addMission} tapHaptic>
                      <Txt variant="label" color={accent}>
                        ADD
                      </Txt>
                    </Press>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          {existing ? (
            <View style={{ gap: 10 }}>
              <Button
                label={achieved ? 'REOPEN GOAL' : 'MARK AS CRUSHED'}
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
      <FxHost />
    </View>
  );
}
