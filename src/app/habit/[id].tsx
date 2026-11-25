import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiPicker } from '@/components/EmojiPicker';
import { FxHost } from '@/components/FxHost';
import { Heatmap } from '@/components/Heatmap';
import { FieldLabel, SheetHeader } from '@/components/pickers';
import { Button, Card, Txt } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { toggleHabit } from '@/store/actions';
import { useData } from '@/store/data';
import { habitBest, habitStreak } from '@/store/selectors';
import { fonts, useTheme } from '@/theme';

/** Create a habit, or see its history (tap any past day to fix it) and edit it. */
export default function HabitScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';
  const habit = useData((s) => (isNew ? undefined : s.habits[params.id]));
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(habit?.title ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '');
  const dirty = !!habit && (title.trim() !== habit.title || emoji !== habit.emoji);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/habits'));

  const save = () => {
    if (!title.trim()) return haptic.warning();
    if (habit) patch('habits', habit.id, { title: title.trim(), emoji });
    else create('habits', { title: title.trim(), emoji, sort_order: Date.now() });
    haptic.medium();
    close();
  };

  const del = () => {
    if (!habit) return;
    const run = () => {
      remove('habits', habit.id);
      haptic.warning();
      close();
    };
    if (Platform.OS === 'web') return run();
    Alert.alert('Delete habit?', 'Its history will be deleted too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  if (!isNew && !habit) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
        <SheetHeader kicker="HABIT" title="NOT FOUND" onClose={close} />
      </View>
    );
  }

  const today = todayKey();
  const counts = Object.fromEntries((habit?.checks ?? []).map((d) => [d, 1]));

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <SheetHeader kicker={isNew ? 'NEW' : 'HABIT'} title={isNew ? 'NEW HABIT' : 'HABIT'} onClose={close} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {emoji ? <Text style={{ fontSize: 32 }}>{emoji}</Text> : null}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Train, Read 20 pages, No sugar"
              placeholderTextColor={c.textFaint}
              selectionColor={accent}
              autoFocus={isNew}
              style={{ flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 24, color: c.text, paddingVertical: 6 }}
            />
          </View>

          {habit ? (
            <Card style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row' }}>
                <Stat label="STREAK" value={`${habitStreak(habit, today)}D`} />
                <Stat label="BEST" value={`${habitBest(habit)}D`} />
                <Stat label="TOTAL" value={String(habit.checks?.length ?? 0)} />
              </View>
              <Heatmap counts={counts} weeks={18} binary legend={false} onPressDay={(d) => toggleHabit(habit.id, d)} />
              <Txt variant="small" color={c.textFaint}>
                Tap a day to mark it done or not done.
              </Txt>
            </Card>
          ) : null}

          <View>
            <FieldLabel>EMOJI</FieldLabel>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </View>

          {isNew || dirty ? <Button label={isNew ? 'ADD HABIT' : 'SAVE'} icon={isNew ? 'add' : 'checkmark'} onPress={save} disabled={!title.trim()} /> : null}
          {habit ? <Button label="DELETE HABIT" icon="trash-outline" variant="danger" onPress={del} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <FxHost />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt variant="h2">{value}</Txt>
      <Txt variant="label" style={{ fontSize: 9 }}>
        {label}
      </Txt>
    </View>
  );
}
