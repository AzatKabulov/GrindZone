import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FieldLabel, MiniCalendar, SheetHeader, TimeStepper } from '@/components/pickers';
import { Button, Chip, Input, Press, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, BLOCK_CATEGORY_KEYS, blockColor, type BlockCategory } from '@/lib/categories';
import { fmtDuration, relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { XP } from '@/lib/xp';
import { toggleBlock } from '@/store/actions';
import { useData } from '@/store/data';
import { fonts, useTheme } from '@/theme';

const DURATIONS = [30, 60, 90, 120, 180];

export default function BlockEditor() {
  const params = useLocalSearchParams<{ id: string; date?: string; start?: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.blocks[params.id]));
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const initialStart = existing?.start_min ?? Math.max(0, Math.min(1410, Number(params.start ?? 540) || 540));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<BlockCategory>(existing?.category ?? 'deep');
  const [date, setDate] = useState(existing?.date ?? params.date ?? todayKey());
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(existing?.end_min ?? Math.min(1440, initialStart + 60));
  const [note, setNote] = useState(existing?.note ?? '');
  const [pickDate, setPickDate] = useState(false);

  const color = blockColor(category, accent);
  const duration = end - start;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/plan'));

  const setStartKeepDuration = (v: number) => {
    const d = Math.max(15, duration);
    setStart(v);
    setEnd(Math.min(1440, v + d));
  };

  const fields = () => ({
    title: title.trim(),
    category,
    date,
    start_min: start,
    end_min: Math.max(start + 15, end),
    note: note.trim(),
  });

  const save = () => {
    if (existing) patch('blocks', existing.id, fields());
    else create('blocks', fields());
    haptic.medium();
    close();
  };

  const del = () => {
    if (!existing) return;
    const run = () => {
      remove('blocks', existing.id);
      haptic.warning();
      close();
    };
    if (Platform.OS === 'web') return run();
    Alert.alert('Delete block?', existing.title || BLOCK_CATEGORIES[existing.category].label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
        <SheetHeader kicker="TIME BLOCK" title="NOT FOUND" onClose={close} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader
        kicker={isNew ? 'NEW TIME BLOCK' : existing?.done ? 'EXECUTED BLOCK' : 'EDIT TIME BLOCK'}
        title={isNew ? 'CLAIM THE HOURS' : 'TIME BLOCK'}
        onClose={close}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 4, borderRadius: 2, backgroundColor: color }} />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={BLOCK_CATEGORIES[category].label.charAt(0) + BLOCK_CATEGORIES[category].label.slice(1).toLowerCase() + '…'}
            placeholderTextColor={c.textFaint}
            selectionColor={accent}
            autoFocus={isNew}
            style={{ flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 24, color: c.text, paddingVertical: 6 }}
          />
        </View>

        <View>
          <FieldLabel>CATEGORY</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BLOCK_CATEGORY_KEYS.map((k) => (
              <Chip
                key={k}
                label={BLOCK_CATEGORIES[k].label}
                icon={BLOCK_CATEGORIES[k].icon}
                color={blockColor(k, accent)}
                active={category === k}
                onPress={() => setCategory(k)}
              />
            ))}
          </View>
        </View>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Txt variant="label" style={{ flex: 1 }}>
              TIME
            </Txt>
            <Press onPress={() => setPickDate((v) => !v)} tapHaptic hitSlop={8}>
              <Txt variant="label" color={accent}>
                {relativeLabel(date)} ▾
              </Txt>
            </Press>
          </View>
          {pickDate ? (
            <View style={{ marginBottom: 12 }}>
              <MiniCalendar
                value={date}
                onChange={(v) => {
                  setDate(v);
                  setPickDate(false);
                }}
              />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TimeStepper label="START" value={start} onChange={setStartKeepDuration} max={1425} />
            <TimeStepper label="END" value={end} onChange={(v) => setEnd(Math.max(start + 15, v))} min={start + 15} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={fmtDuration(d)}
                active={duration === d}
                onPress={() => setEnd(Math.min(1440, start + d))}
              />
            ))}
          </View>
          <Txt variant="label" style={{ marginTop: 12 }}>
            DURATION · {fmtDuration(Math.max(0, duration))} · +{XP.block} XP WHEN EXECUTED
          </Txt>
        </View>

        <View>
          <FieldLabel>NOTE</FieldLabel>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Objective for this block…"
            multiline
            style={{ minHeight: 70, textAlignVertical: 'top', fontSize: 15 }}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Button label={isNew ? 'BLOCK IT' : 'SAVE'} icon={isNew ? 'time' : 'checkmark'} onPress={save} />
          {existing ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label={existing.done ? 'UNDO DONE' : 'EXECUTED'}
                icon={existing.done ? 'refresh' : 'checkmark-done'}
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  patch('blocks', existing.id, fields());
                  close();
                  setTimeout(() => toggleBlock(existing.id), 250);
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
