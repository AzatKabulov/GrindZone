import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { alpha, useTheme } from '@/theme';

export const EMOJIS = [
  '💪', '🏋️', '🏃', '🥊', '🧘', '🚴', '⚽', '🏀',
  '💼', '💻', '📈', '💰', '📊', '🧠', '📚', '✍️',
  '📞', '📧', '🗓️', '🛒', '🧹', '🍳', '🥗', '💊',
  '🎯', '🔥', '⚡', '🚀', '🏆', '👑', '⭐', '✅',
  '🎸', '🎨', '📷', '🎮', '✈️', '🚗', '🏠', '🐶',
  '❤️', '🤝', '🙏', '😴', '🧊', '🌅', '🌙', '💧',
];

/** Grid of hand-picked emoji. Tap the selected one (or ✕) to clear. */
export function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c, accent } = useTheme();
  const pick = (e: string) => {
    haptic.tap();
    onChange(e === value ? '' : e);
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Pressable
        onPress={() => pick('')}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.surface2,
          borderWidth: 1,
          borderColor: value ? c.border : accent,
        }}
      >
        <Ionicons name="close" size={16} color={value ? c.textFaint : accent} />
      </Pressable>
      {EMOJIS.map((e) => {
        const on = e === value;
        return (
          <Pressable
            key={e}
            onPress={() => pick(e)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? alpha(accent, 0.18) : c.surface2,
              borderWidth: 1,
              borderColor: on ? accent : c.border,
            }}
          >
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
