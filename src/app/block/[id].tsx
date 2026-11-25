import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FieldLabel, SheetHeader, TimeField } from '@/components/pickers';
import { Button, Chip, Input, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, BLOCK_CATEGORY_KEYS, blockColor, type BlockCategory } from '@/lib/categories';
import { fmtDuration, fmtMin, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useData } from '@/store/data';
import { fonts, useTheme } from '@/theme';

const LENGTHS = [30, 60, 90, 120, 180, 240];

/** Time block editor: what, what kind, when it starts, how long. */
export default function BlockEditor() {
  const params = useLocalSearchParams<{ id: string; date?: string; start?: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.blocks[params.id]));
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<BlockCategory>(existing?.category ?? 'deep');
  const [start, setStart] = useState(existing?.start_min ?? Math.max(0, Math.min(1410, Number(params.start ?? 540) || 540)));
  const [length, setLength] = useState(existing ? Math.max(15, existing.end_min - existing.start_min) : 60);
  const [note, setNote] = useState(existing?.note ?? '');

  const date = existing?.date ?? params.date ?? todayKey();
  const end = Math.min(1440, start + length);
  const color = blockColor(category, accent);
  const kinds = BLOCK_CATEGORY_KEYS.includes(category) ? BLOCK_CATEGORY_KEYS : [...BLOCK_CATEGORY_KEYS, category];
  const close = () => (router.canGoBack() ? router.back() : router.replace('/plan'));

  const save = () => {
    const fields = { title: title.trim(), category, date, start_min: start, end_min: Math.max(start + 5, end), note: note.trim() };
    if (existing) patch('blocks', existing.id, fields);
    else create('blocks', fields);
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
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader kicker={isNew ? 'NEW' : 'EDIT'} title="TIME BLOCK" onClose={close} />
      <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive" contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 4, borderRadius: 2, backgroundColor: color }} />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What will you do?"
            placeholderTextColor={c.textFaint}
            selectionColor={accent}
            autoFocus={isNew}
            style={{ flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 24, color: c.text, paddingVertical: 6 }}
          />
        </View>

        <View>
          <FieldLabel>KIND</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {kinds.map((k) => (
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

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TimeField label="STARTS" value={start} onChange={setStart} max={1425} />
            <TimeField
              label="ENDS"
              value={end}
              onChange={(v) => setLength(Math.max(5, (v <= start ? v + 1440 : v) - start))}
              max={1439}
            />
          </View>
          <View>
            <FieldLabel>OR PICK A LENGTH</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LENGTHS.map((d) => (
                <Chip key={d} label={fmtDuration(d)} active={length === d} onPress={() => setLength(d)} />
              ))}
            </View>
          </View>
          <Txt variant="small" color={c.textDim}>
            {fmtMin(start)} → {fmtMin(end)} · {fmtDuration(end - start).toLowerCase()}
          </Txt>
        </View>

        <Input value={note} onChangeText={setNote} placeholder="Note (optional)" multiline style={{ minHeight: 60, textAlignVertical: 'top', fontSize: 15 }} />

        <View style={{ gap: 10 }}>
          <Button label={isNew ? 'ADD BLOCK' : 'SAVE'} icon={isNew ? 'add' : 'checkmark'} onPress={save} />
          {existing ? <Button label="DELETE" icon="trash-outline" variant="danger" onPress={del} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
