import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconBtn, Txt } from '@/components/ui';
import { fmtClock, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useData } from '@/store/data';
import { fonts, useTheme } from '@/theme';

export default function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useData((s) => s.notes[id]);
  const { patch, remove } = useData.getState();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const latest = useRef({ title, body });
  const onTitle = (v: string) => {
    latest.current = { ...latest.current, title: v };
    setTitle(v);
  };
  const onBody = (v: string) => {
    latest.current = { ...latest.current, body: v };
    setBody(v);
  };
  const bodyRef = useRef<TextInputInstance>(null);

  const flush = () => {
    const cur = useData.getState().notes[id];
    if (!cur || cur.deleted) return;
    const { title: t, body: b } = latest.current;
    if (t !== cur.title || b !== cur.body) patch('notes', id, { title: t, body: b });
  };

  // Autosave while typing.
  useEffect(() => {
    const t = setTimeout(flush, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  // Save on leave; throw away notes that were never written.
  useEffect(
    () => () => {
      const cur = useData.getState().notes[id];
      if (!cur || cur.deleted) return;
      const { title: t, body: b } = latest.current;
      if (!t.trim() && !b.trim()) useData.getState().remove('notes', id);
      else if (t !== cur.title || b !== cur.body) useData.getState().patch('notes', id, { title: t, body: b });
    },
    [id],
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/notes'));

  if (!note || note.deleted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgElevated, padding: 24, paddingTop: 30 }}>
        <Txt variant="h1">NOTE NOT FOUND</Txt>
      </View>
    );
  }

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const day = isoToKey(note.updated_at) ?? todayKey();
  const edited = day === todayKey() ? `TODAY ${fmtClock(note.updated_at)}` : relativeLabel(day);

  const del = () => {
    const run = () => {
      remove('notes', id);
      haptic.warning();
      close();
    };
    if (Platform.OS === 'web' || (!title.trim() && !body.trim())) return run();
    Alert.alert('Delete note?', title || 'This note will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <IconBtn icon="chevron-down" size={36} onPress={close} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="label">EDITED {edited}</Txt>
        </View>
        <IconBtn
          icon={note.pinned ? 'pin' : 'pin-outline'}
          size={36}
          color={note.pinned ? accent : undefined}
          onPress={() => {
            patch('notes', id, { pinned: !note.pinned });
            haptic.medium();
          }}
        />
        <IconBtn icon="trash-outline" size={36} onPress={del} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <TextInput
          value={title}
          onChangeText={onTitle}
          placeholder="Title"
          placeholderTextColor={c.textFaint}
          selectionColor={accent}
          autoFocus={!note.title && !note.body}
          multiline
          submitBehavior="submit"
          returnKeyType="next"
          onSubmitEditing={() => bodyRef.current?.focus()}
          style={{ fontFamily: fonts.bold, fontSize: 27, lineHeight: 33, color: c.text, paddingVertical: 4 }}
        />
        <View style={{ height: 2, width: 36, backgroundColor: accent, marginVertical: 14, borderRadius: 1 }} />
        <TextInput
          ref={bodyRef}
          value={body}
          onChangeText={onBody}
          placeholder="Write it down. Lessons, plans, ideas, reflections…"
          placeholderTextColor={c.textFaint}
          selectionColor={accent}
          multiline
          scrollEnabled={false}
          style={{ fontFamily: fonts.body, fontSize: 16.5, lineHeight: 26, color: c.text, minHeight: 300, textAlignVertical: 'top' }}
        />
      </ScrollView>
      <View style={{ position: 'absolute', right: 20, bottom: insets.bottom + 12 }} pointerEvents="none">
        <Txt variant="label" color={c.textFaint}>
          {words} WORDS
        </Txt>
      </View>
    </KeyboardAvoidingView>
  );
}
