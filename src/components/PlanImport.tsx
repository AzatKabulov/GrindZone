import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import { fmtDuration, fmtMin, niceLabel } from '@/lib/date';
import { parsePlan } from '@/lib/planParse';
import { addPlanBlocks } from '@/store/actions';
import { useFx } from '@/store/fx';
import { fonts, useTheme } from '@/theme';
import { Button, Txt } from './ui';

const EXAMPLE = `10:30 - 12:30 Wake up, skincare, eat
12:30 - 2:30 Deep work
2:30 - 3:30 Eat
5:00 - 11:00 Work
12:30 - 2:00 Sleep`;

/** Paste (or type) a whole day the way you write it in your notes; see the blocks before adding them. */
export function PlanImport({ day, existing, onClose }: { day: string; existing: number; onClose: () => void }) {
  const { c, accent, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [replace, setReplace] = useState(false);
  const { blocks, skipped } = useMemo(() => parsePlan(text), [text]);

  const add = () => {
    if (!blocks.length) return;
    addPlanBlocks(day, blocks, replace);
    useFx.getState().info('PLAN ADDED', `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'} for ${niceLabel(day).toLowerCase()}.`);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} />
        <View
          style={{
            maxHeight: '92%',
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: c.border,
            paddingBottom: insets.bottom + 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, paddingBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={accent}>
                {niceLabel(day).toUpperCase()}
              </Txt>
              <Txt variant="h2" style={{ marginTop: 2 }}>
                WRITE YOUR PLAN
              </Txt>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close-circle" size={28} color={c.textFaint} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingTop: 8, gap: 14 }}>
            <Txt variant="small" color={c.textDim}>
              One block per line, time first — like in your notes. 12-hour times without am/pm are read in the order of your day.
            </Txt>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              autoCorrect={false}
              placeholder={EXAMPLE}
              placeholderTextColor={c.textFaint}
              selectionColor={accent}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              style={{
                minHeight: 150,
                maxHeight: 240,
                padding: 14,
                borderRadius: 14,
                backgroundColor: c.bg,
                borderWidth: 1,
                borderColor: c.border,
                fontFamily: fonts.mono,
                fontSize: 14.5,
                lineHeight: 24,
                color: c.text,
                textAlignVertical: 'top',
              }}
            />

            {blocks.length ? (
              <View style={{ gap: 6 }}>
                <Txt variant="label">
                  PREVIEW · {blocks.length} {blocks.length === 1 ? 'BLOCK' : 'BLOCKS'}
                </Txt>
                {blocks.map((b, i) => {
                  const col = blockColor(b.category, accent);
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: col }} />
                      <Text style={{ width: 108, fontFamily: fonts.monoBold, fontSize: 13, color: c.text }}>
                        {fmtMin(b.start)}–{fmtMin(b.end)}
                        {b.end > 1440 ? ' ☾' : ''}
                      </Text>
                      <Txt variant="body" numberOfLines={1} style={{ flex: 1 }}>
                        {b.title || BLOCK_CATEGORIES[b.category].label}
                      </Txt>
                      <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: c.textDim }}>{fmtDuration(b.end - b.start)}</Text>
                    </View>
                  );
                })}
                {skipped.length ? (
                  <Txt variant="small" color={c.textFaint}>
                    Skipped {skipped.length} {skipped.length === 1 ? 'line' : 'lines'} without a time: {skipped.slice(0, 2).join(' · ')}
                    {skipped.length > 2 ? '…' : ''}
                  </Txt>
                ) : null}
              </View>
            ) : null}

            {existing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="title" style={{ fontSize: 15 }}>
                    Replace this day&apos;s plan
                  </Txt>
                  <Txt variant="small" color={c.textDim}>
                    Removes the {existing} {existing === 1 ? 'block' : 'blocks'} already there.
                  </Txt>
                </View>
                <Switch value={replace} onValueChange={setReplace} trackColor={{ true: accent, false: c.surface3 }} />
              </View>
            ) : null}

            <Button label={blocks.length ? `ADD ${blocks.length} ${blocks.length === 1 ? 'BLOCK' : 'BLOCKS'}` : 'ADD TO PLAN'} icon="add" onPress={add} disabled={!blocks.length} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
