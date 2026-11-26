import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiButton } from '@/components/EmojiPicker';
import { FxHost } from '@/components/FxHost';
import { MonthGrid, MonthHeader, shiftMonth, useCellSize } from '@/components/MonthCalendar';
import { SheetHeader } from '@/components/pickers';
import { Button, Card, Txt } from '@/components/ui';
import { addDays, parseKey, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { toggleHabit } from '@/store/actions';
import { useData } from '@/store/data';
import { habitRate, habitStart } from '@/store/habitStats';
import { habitBest, habitStreak } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';

/** Create a habit, or see its history (tap any past day to fix it) and edit it. */
export default function HabitScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';
  const habit = useData((s) => (isNew ? undefined : s.habits[params.id]));
  const { create, patch, remove } = useData.getState();
  const { c, accent, onAccent } = useTheme();
  const insets = useSafeAreaInsets();

  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const size = useCellSize(76);
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
  const checks = new Set(habit?.checks ?? []);
  const start = habit ? habitStart(habit) : today;
  const monthEnd = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const monthRate = habit ? habitRate(habit, `${month}-01`, monthEnd, today) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <View style={{ flex: 1 }}>
        <SheetHeader kicker={isNew ? 'NEW' : 'HABIT'} title={isNew ? 'NEW HABIT' : 'HABIT'} onClose={close} />
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive" contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <EmojiButton value={emoji} onChange={setEmoji} />
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
              <MonthHeader month={month} onShift={(n) => setMonth(shiftMonth(month, n))} canNext={month < today.slice(0, 7)} />
              <MonthGrid
                month={month}
                size={size}
                renderDay={(d) => {
                  const done = checks.has(d);
                  const future = d > today;
                  const counted = d >= start && !future;
                  return (
                    <Pressable
                      disabled={future}
                      onPress={() => toggleHabit(habit.id, d)}
                      accessibilityLabel={`${d}: ${done ? 'done' : 'not done'}`}
                      style={{
                        width: size,
                        height: size,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: done ? accent : counted ? c.surface2 : 'transparent',
                        borderWidth: d === today ? 1.5 : counted || done ? 0 : 1,
                        borderColor: d === today ? c.text : alpha(c.border, 0.8),
                        opacity: future ? 0.35 : 1,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: done ? onAccent : counted ? c.text : c.textFaint }}>
                        {parseKey(d).getDate()}
                      </Text>
                      {done ? <Ionicons name="checkmark-sharp" size={11} color={onAccent} style={{ marginTop: -1 }} /> : null}
                    </Pressable>
                  );
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: accent }} />
                  <Txt variant="small" color={c.textDim}>Done</Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.surface2 }} />
                  <Txt variant="small" color={c.textDim}>Missed</Txt>
                </View>
                <Txt variant="small" color={c.textFaint} style={{ flex: 1, textAlign: 'right' }}>
                  {monthRate && monthRate.possible ? `${monthRate.done}/${monthRate.possible} days · ${Math.round((monthRate.rate ?? 0) * 100)}%` : ''}
                </Txt>
              </View>
              <Txt variant="small" color={c.textFaint}>
                Tap a day to mark it done or not done.
              </Txt>
            </Card>
          ) : null}

          {isNew || dirty ? <Button label={isNew ? 'ADD HABIT' : 'SAVE'} icon={isNew ? 'add' : 'checkmark'} onPress={save} disabled={!title.trim()} /> : null}
          {habit ? <Button label="DELETE HABIT" icon="trash-outline" variant="danger" onPress={del} /> : null}
        </ScrollView>
      </View>
      <FxHost inSheet />
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
