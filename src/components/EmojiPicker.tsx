import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { alpha, useTheme } from '@/theme';
import { Txt } from './ui';

/** Hand-picked emoji, grouped by what tasks and habits are usually about. */
export const EMOJI_GROUPS: { title: string; items: string[] }[] = [
  { title: 'TRAINING', items: ['💪', '🏋️', '🏃', '🥊', '🧘', '🚴', '🏊', '⚽', '🏀', '🎾', '🥋', '🧗', '⛹️', '🤸'] },
  { title: 'WORK & MONEY', items: ['💼', '💻', '📈', '💰', '📊', '💵', '🏦', '🧾', '📝', '🖥️', '📱', '🤑', '🛠️', '🧑‍💻'] },
  { title: 'STUDY & MIND', items: ['🧠', '📚', '📖', '✍️', '🎓', '🔬', '🧮', '🗣️', '🎧', '🧩', '♟️', '📓'] },
  { title: 'CALLS & ADMIN', items: ['📞', '📧', '🗓️', '⏰', '📌', '📎', '📦', '📮', '🗂️', '🔑'] },
  { title: 'HOME & ERRANDS', items: ['🧹', '🧺', '🛒', '🍳', '🏠', '🔧', '🪴', '🚗', '⛽', '💈', '👔', '🧼'] },
  { title: 'HEALTH & FOOD', items: ['🥗', '🍎', '🥩', '🥚', '💊', '💧', '🥤', '☕', '😴', '🦷', '🩺', '🚭'] },
  { title: 'PEOPLE', items: ['🤝', '❤️', '👨‍👩‍👧', '👫', '🎁', '🎉', '🍻', '🙏', '💬', '🐶'] },
  { title: 'FUN & CREATIVE', items: ['🎸', '🎨', '📷', '🎮', '🎬', '🎹', '✏️', '🎤', '🎲', '📺'] },
  { title: 'TRAVEL & OUTSIDE', items: ['✈️', '🏖️', '🏔️', '🌅', '🌙', '🌳', '🚶', '🗺️', '🧳', '🚲'] },
  { title: 'DRIVE', items: ['🎯', '🔥', '⚡', '🚀', '🏆', '👑', '⭐', '✅', '💎', '🧊', '⚔️', '🦁'] },
];

/**
 * The emoji slot next to a title. Empty, it shows a "add emoji" button; tap to open the picker sheet.
 */
export function EmojiButton({ value, onChange, size = 48 }: { value: string; onChange: (v: string) => void; size?: number }) {
  const { c, accent } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => {
          haptic.tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={value ? `Emoji ${value}. Change` : 'Add an emoji'}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size * 0.3,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? c.surface3 : c.surface2,
          borderWidth: 1.5,
          borderStyle: value ? 'solid' : 'dashed',
          borderColor: value ? c.border : alpha(accent, 0.6),
        })}
      >
        {value ? (
          <Text style={{ fontSize: size * 0.55 }}>{value}</Text>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="happy-outline" size={size * 0.42} color={accent} />
            <View style={{ position: 'absolute', right: -size * 0.14, top: -size * 0.12, backgroundColor: c.surface2, borderRadius: 8 }}>
              <Ionicons name="add-circle" size={size * 0.28} color={accent} />
            </View>
          </View>
        )}
      </Pressable>
      {open ? (
        <EmojiSheet
          value={value}
          onPick={(e) => {
            haptic.tap();
            onChange(e);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function EmojiSheet({ value, onPick, onClose }: { value: string; onPick: (e: string) => void; onClose: () => void }) {
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} />
        <View
          style={{
            maxHeight: '78%',
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: c.border,
            paddingBottom: insets.bottom + 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, paddingBottom: 10, gap: 10 }}>
            <Txt variant="h2" style={{ flex: 1 }}>
              PICK AN EMOJI
            </Txt>
            {value ? (
              <Pressable
                onPress={() => onPick('')}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 9, backgroundColor: c.surface2 }}
              >
                <Ionicons name="close" size={14} color={c.textDim} />
                <Txt variant="label" color={c.textDim}>
                  NONE
                </Txt>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close-circle" size={28} color={c.textFaint} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 16 }}>
            {EMOJI_GROUPS.map((g) => (
              <View key={g.title} style={{ gap: 8 }}>
                <Txt variant="label">{g.title}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {g.items.map((e) => {
                    const on = e === value;
                    return (
                      <Pressable
                        key={e}
                        onPress={() => onPick(e)}
                        style={({ pressed }) => ({
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: on ? alpha(accent, 0.2) : pressed ? c.surface3 : c.surface2,
                          borderWidth: on ? 1.5 : 0,
                          borderColor: accent,
                        })}
                      >
                        <Text style={{ fontSize: 22 }}>{e}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
