import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiPicker } from '@/components/EmojiPicker';
import { DatePicker, FieldLabel, SheetHeader } from '@/components/pickers';
import { Subtasks } from '@/components/Subtasks';
import { Button, Chip, Input } from '@/components/ui';
import { PRIORITIES, type Priority } from '@/lib/categories';
import { addDays, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { toggleTask } from '@/store/actions';
import { useData, uuid, type Subtask } from '@/store/data';
import { alive } from '@/store/selectors';
import { fonts, useTheme } from '@/theme';

/** Task editor: what, when, how important, an emoji, the steps, and (optionally) the goal it serves. */
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
  const [emoji, setEmoji] = useState(existing?.emoji ?? '');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 2);
  const [steps, setSteps] = useState<Subtask[]>(existing?.subtasks ?? []);
  const [due, setDue] = useState<string | null>(existing ? existing.due_date : params.due === 'none' ? null : (params.due ?? today));
  const [goalId, setGoalId] = useState<string | null>(existing?.goal_id ?? params.goal ?? null);

  const activeGoals = useMemo(() => alive(goals).filter((g) => g.status === 'active' || g.id === goalId), [goals, goalId]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const fields = () => ({ title: title.trim(), notes: notes.trim(), emoji, priority, subtasks: steps, due_date: due, goal_id: goalId });

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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            {emoji ? <Text style={{ fontSize: 30, lineHeight: 40 }}>{emoji}</Text> : null}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to get done?"
              placeholderTextColor={c.textFaint}
              selectionColor={accent}
              autoFocus={isNew}
              multiline
              style={{ flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: c.text, paddingVertical: 6 }}
            />
          </View>
          <Input value={notes} onChangeText={setNotes} placeholder="Note (optional)" multiline style={{ marginTop: 10, minHeight: 60, textAlignVertical: 'top', fontSize: 15 }} />
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

        <View>
          <FieldLabel>PRIORITY</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([1, 2, 3] as Priority[]).map((p) => (
              <Chip
                key={p}
                label={`${PRIORITIES[p].emoji}  ${PRIORITIES[p].label}`}
                active={priority === p}
                onPress={() => setPriority(p)}
                style={{ flex: 1, justifyContent: 'center' }}
              />
            ))}
          </View>
        </View>

        <View>
          <FieldLabel>STEPS</FieldLabel>
          <Subtasks
            items={steps}
            onToggle={(id) => setSteps((l) => l.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))}
            onRemove={(id) => setSteps((l) => l.filter((x) => x.id !== id))}
            onAdd={(t) => setSteps((l) => [...l, { id: uuid(), title: t, done: false }])}
          />
        </View>

        <View>
          <FieldLabel>EMOJI</FieldLabel>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </View>

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
