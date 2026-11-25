import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useData } from '@/store/data';
import { font, useTheme } from '@/theme';
import { Icon } from './Icon';

/** Reminders-style "New Task" row. */
export function QuickAdd({ day, goalId, placeholder = 'New Task' }: { day: string | null; goalId?: string; placeholder?: string }) {
  const { c, accent } = useTheme();
  const create = useData((s) => s.create);
  const [text, setText] = useState('');
  const submit = () => {
    const title = text.trim();
    if (!title) return;
    create('tasks', { title, due_date: day, goal_id: goalId ?? null });
    haptic.medium();
    setText('');
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 14, minHeight: 48 }}>
      <Icon name="plusCircle" size={24} color={accent} />
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={c.label3}
        selectionColor={accent}
        returnKeyType="done"
        submitBehavior="submit"
        style={{ flex: 1, ...font('400'), fontSize: 17, color: c.label, paddingVertical: 12 }}
      />
    </View>
  );
}
