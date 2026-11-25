import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePicker, FieldLabel, SheetHeader } from '@/components/pickers';
import { Button, Chip, Input, Press, Txt } from '@/components/ui';
import { isImportant } from '@/lib/categories';
import { addDays, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { XP } from '@/lib/xp';
import { toggleTask } from '@/store/actions';
import { useData } from '@/store/data';
import { alive } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';

/** Task editor: what, when, is it important, (optionally) which goal. That's it. */
export default function TaskEditor() {
  const params = useLocalSearchParams<{ id: string; due?: string; goal?: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.tasks[params.id]));
  const goals = useData((s) => s.goals);
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayKey();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [important, setImportant] = useState(existing ? isImportant(existing.priority) : false);
  const [due, setDue] = useState<string | null>(existing ? existing.due_date : params.due === 'none' ? null : (params.due ?? today));
  const [goalId, setGoalId] = useState<string | null>(existing?.goal_id ?? params.goal ?? null);

  const activeGoals = useMemo(() => alive(goals).filter((g) => g.status === 'active' || g.id === goalId), [goals, goalId]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const fields = () => ({ title: title.trim(), notes: notes.trim(), priority: important ? (1 as const) : (2 as const), due_date: due, goal_id: goalId });

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
    Alert.alert('Delete task?', existing.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
        <SheetHeader kicker="TASK" title="NOT FOUND" onClose={close} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader kicker={isNew ? 'NEW' : existing?.done ? 'DONE' : 'EDIT'} title={isNew ? 'NEW TASK' : 'TASK'} onClose={close} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }} keyboardShouldPersistTaps="handled">
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
            placeholder="Note (optional)"
            multiline
            style={{ marginTop: 10, minHeight: 60, textAlignVertical: 'top', fontSize: 15 }}
          />
        </View>

        <View>
          <FieldLabel>WHEN</FieldLabel>
          <DatePicker
            value={due}
            onChange={setDue}
            options={[
              { label: 'TODAY', v: today },
              { label: 'TOMORROW', v: addDays(today, 1) },
              { label: 'SOMEDAY', v: null },
            ]}
          />
        </View>

        <Press
          scaleTo={0.98}
          onPress={() => setImportant((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: important ? alpha(accent, 0.45) : c.border,
            backgroundColor: important ? alpha(accent, 0.08) : c.surface,
          }}
        >
          <Ionicons name="flame" size={20} color={important ? accent : c.textFaint} />
          <View style={{ flex: 1 }}>
            <Txt variant="title">Important</Txt>
            <Txt variant="small" color={c.textDim}>
              Shows first · +{XP.task[1]} XP instead of +{XP.task[2]}
            </Txt>
          </View>
          <Switch
            value={important}
            onValueChange={(v) => {
              haptic.tap();
              setImportant(v);
            }}
            trackColor={{ true: accent, false: c.surface3 }}
            thumbColor="#FFFFFF"
          />
        </Press>

        {activeGoals.length ? (
          <View>
            <FieldLabel>GOAL (OPTIONAL)</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="NONE" active={!goalId} onPress={() => setGoalId(null)} />
              {activeGoals.map((g) => (
                <Chip key={g.id} label={g.title.toUpperCase() || 'UNTITLED'} active={goalId === g.id} onPress={() => setGoalId(g.id)} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Button label={isNew ? 'ADD TASK' : 'SAVE'} icon={isNew ? 'add' : 'checkmark'} onPress={save} disabled={!title.trim()} />
          {existing ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label={existing.done ? 'NOT DONE' : 'MARK DONE'}
                icon={existing.done ? 'refresh' : 'checkmark-done'}
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  if (title.trim()) patch('tasks', existing.id, fields());
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
