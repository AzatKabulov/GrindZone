import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';

import { DateField, TimeField } from '@/components/fields';
import { HeaderActions } from '@/components/header';
import { Icon } from '@/components/Icon';
import { Button, InputRow, ListSection, Press, Row, ScrollScreen, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, BLOCK_CATEGORY_KEYS, blockColor, type BlockCategory } from '@/lib/categories';
import { fmtDuration, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { XP } from '@/lib/xp';
import { toggleBlock } from '@/store/actions';
import { useData } from '@/store/data';
import { alpha, squircle, useTheme } from '@/theme';

const DURATIONS = [30, 60, 90, 120, 180];

export default function BlockEditor() {
  const params = useLocalSearchParams<{ id: string; date?: string; start?: string }>();
  const isNew = params.id === 'new';
  const existing = useData((s) => (isNew ? undefined : s.blocks[params.id]));
  const { create, patch, remove } = useData.getState();
  const { c, accent } = useTheme();

  const initialStart = existing?.start_min ?? Math.max(0, Math.min(1410, Number(params.start ?? 540) || 540));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<BlockCategory>(existing?.category ?? 'deep');
  const [date, setDate] = useState(existing?.date ?? params.date ?? todayKey());
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(existing?.end_min ?? Math.min(1440, initialStart + 60));
  const [note, setNote] = useState(existing?.note ?? '');

  const duration = end - start;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/plan'));

  const changeStart = (v: number) => {
    const d = Math.max(15, duration);
    setStart(v);
    setEnd(Math.min(1440, v + d));
  };
  const changeEnd = (v: number) => setEnd(v <= start ? Math.min(1440, start + 15) : v);

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
    Alert.alert('Delete Block?', existing.title || BLOCK_CATEGORIES[existing.category].label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  if (!isNew && !existing) {
    return (
      <ScrollScreen>
        <Txt variant="title2" center style={{ marginTop: 80 }}>
          Block not found
        </Txt>
      </ScrollScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New Block' : 'Time Block' }} />
      <HeaderActions
        left={[{ key: 'cancel', label: 'Cancel', onPress: close }]}
        right={[{ key: 'save', label: isNew ? 'Add' : 'Done', variant: 'done', onPress: save }]}
      />
      <ScrollScreen contentContainerStyle={{ paddingTop: 12 }}>
        <ListSection>
          <InputRow value={title} onChangeText={setTitle} placeholder={BLOCK_CATEGORIES[category].label} autoFocus={isNew} returnKeyType="done" />
        </ListSection>

        <Txt variant="footnote" color={c.label2} style={{ textTransform: 'uppercase', marginLeft: 16, marginTop: 22, marginBottom: 8 }}>
          Category
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
          {BLOCK_CATEGORY_KEYS.map((k) => {
            const col = blockColor(k, c, accent);
            const on = category === k;
            return (
              <Press
                key={k}
                tapHaptic
                scaleTo={0.94}
                onPress={() => setCategory(k)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    height: 38,
                    paddingHorizontal: 14,
                    borderRadius: 19,
                    backgroundColor: on ? col : c.card,
                  },
                  squircle,
                ]}
              >
                <Icon name={BLOCK_CATEGORIES[k].icon} size={14} color={on ? '#FFFFFF' : col} />
                <Txt variant="subhead" weight="600" color={on ? '#FFFFFF' : c.label}>
                  {BLOCK_CATEGORIES[k].label}
                </Txt>
              </Press>
            );
          })}
        </ScrollView>

        <ListSection style={{ marginTop: 22 }} inset={60}>
          <Row icon="calendar" iconColor={c.red} title="Date" right={<DateField value={date} onChange={setDate} />} />
          <Row icon="clock" iconColor={c.blue} title="Starts" right={<TimeField day={date} value={start} onChange={changeStart} />} />
          <Row icon="timer" iconColor={c.indigo} title="Ends" right={<TimeField day={date} value={end} onChange={changeEnd} />} />
        </ListSection>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingHorizontal: 4 }}>
          {DURATIONS.map((d) => {
            const on = duration === d;
            return (
              <Press
                key={d}
                tapHaptic
                onPress={() => setEnd(Math.min(1440, start + d))}
                style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center', backgroundColor: on ? accent : alpha(c.fill, 0.7) }}
              >
                <Txt variant="footnote" weight="600" color={on ? '#FFFFFF' : c.label}>
                  {fmtDuration(d)}
                </Txt>
              </Press>
            );
          })}
        </View>
        <Txt variant="footnote" color={c.label2} style={{ marginHorizontal: 16, marginTop: 10 }}>
          {fmtDuration(Math.max(0, duration))} · executing this block earns {XP.block} XP.
        </Txt>

        <ListSection style={{ marginTop: 22 }}>
          <InputRow value={note} onChangeText={setNote} placeholder="Objective for this block" multiline />
        </ListSection>

        {existing ? (
          <View style={{ marginTop: 28, gap: 10 }}>
            <Button
              label={existing.done ? 'Mark as Not Done' : 'Mark as Done'}
              icon={existing.done ? 'undo' : 'checkCircle'}
              variant="tinted"
              onPress={() => {
                patch('blocks', existing.id, fields());
                close();
                setTimeout(() => toggleBlock(existing.id), 300);
              }}
            />
            <Button label="Delete Block" variant="plain" color={c.red} onPress={del} />
          </View>
        ) : null}
      </ScrollScreen>
    </>
  );
}
