import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { fonts, useTheme } from '@/theme';
import { Press, Txt } from './ui';

/** One input to add something fast: type, hit return. */
export function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (title: string) => void }) {
  const { c, accent } = useTheme();
  const [text, setText] = useState('');
  const submit = () => {
    const title = text.trim();
    if (!title) return;
    onAdd(title);
    haptic.medium();
    setText('');
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        height: 52,
        borderRadius: 14,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Ionicons name="add" size={22} color={accent} />
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={c.textFaint}
        selectionColor={accent}
        returnKeyType="done"
        submitBehavior="submit"
        style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15.5, color: c.text, height: '100%' }}
      />
      {text.trim() ? (
        <Press onPress={submit} tapHaptic hitSlop={10}>
          <Txt variant="label" color={accent}>
            ADD
          </Txt>
        </Press>
      ) : null}
    </View>
  );
}

/** "Show 3 done ▾" — keeps finished items out of the way until you want them. */
export function DoneToggle({
  count,
  open,
  onToggle,
  label = 'DONE',
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
  label?: string;
}) {
  const { c } = useTheme();
  if (!count) return null;
  return (
    <Press onPress={onToggle} tapHaptic hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, alignSelf: 'flex-start' }}>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={c.textDim} />
      <Txt variant="label" color={c.textDim}>
        {open ? `HIDE ${label}` : `SHOW ${count} ${label}`}
      </Txt>
    </Press>
  );
}
