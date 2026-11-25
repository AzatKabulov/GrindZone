import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePicker, FieldLabel, SheetHeader } from '@/components/pickers';
import { Button, Chip, Input, Txt } from '@/components/ui';
import { GOAL_CATEGORIES, PRIORITIES } from '@/lib/categories';
import { todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import type { Priority } from '@/lib/xp';
import { XP } from '@/lib/xp';
import { toggleTask } from '@/store/actions';
import { useData } from '@/store/data';
import { alive } from '@/store/selectors';
import { fonts, useTheme } from '@/theme';

export default function TaskEditor() {
  const params = useLocalSearchParams<{ id: string; due?: string; goal?: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.tasks[params.id]));
  const goals = useData((s) => s.goals);
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 2);
  const [due, setDue] = useState<string | null>(
    existing ? existing.due_date : params.due === 'none' ? null : (params.due ?? todayKey()),
  );
  const [goalId, setGoalId] = useState<string | null>(existing?.goal_id ?? params.goal ?? null);

  const activeGoals = useMemo(
    () => alive(goals).filter((g) => g.status === 'active' || g.id === goalId),
    [goals, goalId],
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const save = () => {
    const t = title.trim();
    if (!t) {
      haptic.warning();
      return;
    }
    const fields = { title: t, notes: notes.trim(), priority, due_date: due, goal_id: goalId };
    if (existing) patch('tasks', existing.id, fields);
    else create('tasks', fields);
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
    Alert.alert('Delete mission?', existing.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
        <SheetHeader kicker="MISSION" title="NOT FOUND" onClose={close} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bgElevated }}
    >
      <SheetHeader kicker={isNew ? 'NEW MISSION' : existing?.done ? 'COMPLETED MISSION' : 'EDIT MISSION'} title={isNew ? 'SET THE TARGET' : 'MISSION BRIEF'} onClose={close} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to get done?"
            placeholderTextColor={c.textFaint}
            selectionColor={accent}
            autoFocus={isNew}
            multiline
            style={{ fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: c.text, paddingVertical: 6 }}
          />
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Details, steps, context…"
            multiline
            style={{ marginTop: 12, minHeight: 84, textAlignVertical: 'top', fontSize: 15 }}
          />
        </View>

        <View>
          <FieldLabel>PRIORITY</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([1, 2, 3] as Priority[]).map((p) => (
              <Chip
                key={p}
                label={`${PRIORITIES[p].label} · ${PRIORITIES[p].name}`}
                active={priority === p}
                onPress={() => setPriority(p)}
                style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}
              />
            ))}
          </View>
          <Txt variant="label" color={accent} style={{ marginTop: 10 }}>
            +{XP.task[priority]} XP ON COMPLETION
          </Txt>
        </View>

        <View>
          <FieldLabel>DUE</FieldLabel>
          <DatePicker value={due} onChange={setDue} noneLabel="INBOX" />
        </View>

        <View>
          <FieldLabel>SERVES GOAL</FieldLabel>
          {activeGoals.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="NONE" active={!goalId} onPress={() => setGoalId(null)} />
              {activeGoals.map((g) => (
                <Chip
                  key={g.id}
                  label={g.title.toUpperCase() || 'UNTITLED'}
                  icon={GOAL_CATEGORIES[g.category]?.icon}
                  active={goalId === g.id}
                  onPress={() => setGoalId(g.id)}
                />
              ))}
            </View>
          ) : (
            <Chip label="+ CREATE A GOAL FIRST" onPress={() => router.push({ pathname: '/goal/[id]', params: { id: 'new' } })} />
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Button label={isNew ? 'LOCK IT IN' : 'SAVE'} icon={isNew ? 'flash' : 'checkmark'} onPress={save} disabled={!title.trim()} />
          {existing ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label={existing.done ? 'REOPEN' : 'COMPLETE'}
                icon={existing.done ? 'refresh' : 'checkmark-done'}
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  if (title.trim()) patch('tasks', existing.id, { title: title.trim(), notes: notes.trim(), priority, due_date: due, goal_id: goalId });
                  close();
                  setTimeout(() => toggleTask(existing.id), 250);
                }}
              />
              <Button label="DELETE" icon="trash-outline" variant="danger" style={{ flex: 1 }} onPress={del} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
