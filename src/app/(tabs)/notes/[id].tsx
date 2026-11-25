import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';

import { HeaderActions, type HeaderAction } from '@/components/header';
import { Txt } from '@/components/ui';
import { fmtClock, isoToKey, longDate, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useData } from '@/store/data';
import { font, useTheme } from '@/theme';

export default function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useData((s) => s.notes[id]);
  const { patch, remove } = useData.getState();
  const { c, accent, isDark } = useTheme();

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [editing, setEditing] = useState(false);
  const latest = useRef({ title, body });
  const bodyRef = useRef<TextInputInstance>(null);

  const onTitle = (v: string) => {
    latest.current = { ...latest.current, title: v };
    setTitle(v);
  };
  const onBody = (v: string) => {
    latest.current = { ...latest.current, body: v };
    setBody(v);
  };

  // Autosave while typing.
  useEffect(() => {
    const t = setTimeout(() => {
      const cur = useData.getState().notes[id];
      if (!cur || cur.deleted) return;
      const { title: tt, body: bb } = latest.current;
      if (tt !== cur.title || bb !== cur.body) patch('notes', id, { title: tt, body: bb });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  // Save on leave; drop notes that were never written.
  useEffect(
    () => () => {
      const s = useData.getState();
      const cur = s.notes[id];
      if (!cur || cur.deleted) return;
      const { title: tt, body: bb } = latest.current;
      if (!tt.trim() && !bb.trim()) s.remove('notes', id);
      else if (tt !== cur.title || bb !== cur.body) s.patch('notes', id, { title: tt, body: bb });
    },
    [id],
  );

  if (!note || note.deleted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', paddingTop: 120 }}>
        <Txt variant="title2">Note not found</Txt>
      </View>
    );
  }

  const del = () => {
    const run = () => {
      remove('notes', id);
      haptic.warning();
      if (router.canGoBack()) router.back();
    };
    if (Platform.OS === 'web' || (!title.trim() && !body.trim())) return run();
    Alert.alert('Delete Note?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const day = isoToKey(note.updated_at) ?? todayKey();
  const right: HeaderAction[] = [
    {
      key: 'more',
      label: 'More',
      icon: 'ellipsis',
      menu: [
        {
          label: note.pinned ? 'Unpin Note' : 'Pin Note',
          icon: note.pinned ? 'pinOff' : 'pin',
          onPress: () => {
            patch('notes', id, { pinned: !note.pinned });
            haptic.medium();
          },
        },
        { label: 'Delete', icon: 'trash', destructive: true, onPress: del },
      ],
    },
  ];
  if (editing) right.push({ key: 'done', label: 'Done', variant: 'done', onPress: () => Keyboard.dismiss() });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <HeaderActions right={right} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
      >
        <Txt variant="footnote" color={c.label2} center style={{ marginTop: 6, marginBottom: 10 }}>
          {longDate(day)} at {fmtClock(note.updated_at)}
        </Txt>
        <TextInput
          value={title}
          onChangeText={onTitle}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          placeholder="Title"
          placeholderTextColor={c.label3}
          selectionColor={accent}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          autoFocus={!note.title && !note.body}
          multiline
          submitBehavior="submit"
          returnKeyType="next"
          onSubmitEditing={() => bodyRef.current?.focus()}
          style={{ ...font('700'), fontSize: 28, lineHeight: 34, color: c.label, paddingVertical: 4 }}
        />
        <TextInput
          ref={bodyRef}
          value={body}
          onChangeText={onBody}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          placeholder="Start writing…"
          placeholderTextColor={c.label3}
          selectionColor={accent}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          multiline
          scrollEnabled={false}
          style={{ ...font('400'), fontSize: 17, lineHeight: 25, color: c.label, minHeight: 360, marginTop: 6, textAlignVertical: 'top' }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
