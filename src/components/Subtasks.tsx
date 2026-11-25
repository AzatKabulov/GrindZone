import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';

import type { Subtask } from '@/store/data';
import { alpha, fonts, useTheme } from '@/theme';
import { Txt } from './ui';

/** Checklist of steps inside a task. */
export function Subtasks({
  items,
  onToggle,
  onRemove,
  onAdd,
}: {
  items: Subtask[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (title: string) => void;
}) {
  const { c, accent, onAccent } = useTheme();
  const [text, setText] = useState('');
  const input = useRef<TextInputInstance>(null);
  const add = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  // The plus adds the typed step; with nothing typed it opens the keyboard.
  const onPlus = () => (text.trim() ? add() : input.current?.focus());
  return (
    <View style={{ gap: 2 }}>
      {items.map((s) => (
        <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <Pressable
            hitSlop={10}
            onPress={() => onToggle(s.id)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: s.done ? accent : c.borderStrong,
              backgroundColor: s.done ? accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {s.done ? <Ionicons name="checkmark-sharp" size={14} color={onAccent} /> : null}
          </Pressable>
          <Txt
            variant="body"
            color={s.done ? c.textDim : c.text}
            style={{ flex: 1, textDecorationLine: s.done ? 'line-through' : 'none' }}
          >
            {s.title}
          </Txt>
          <Pressable hitSlop={10} onPress={() => onRemove(s.id)}>
            <Ionicons name="close" size={16} color={c.textFaint} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
        <Pressable
          onPress={onPlus}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Add step"
          style={({ pressed }) => ({
            width: 20,
            height: 20,
            borderRadius: 6,
            backgroundColor: alpha(accent, pressed ? 0.3 : 0.15),
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="add" size={15} color={accent} />
        </Pressable>
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          placeholder={items.length ? 'Add another step…' : 'Add a step…'}
          placeholderTextColor={c.textFaint}
          selectionColor={accent}
          returnKeyType="done"
          submitBehavior="submit"
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: c.text, paddingVertical: 4 }}
        />
      </View>
    </View>
  );
}
