import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Empty, IconBtn, Press, Screen, ScreenTitle, Section, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { fmtClock, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { useData, type Note } from '@/store/data';
import { alive } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';

export default function NotesScreen() {
  const { c, accent } = useTheme();
  const notes = useData((s) => s.notes);
  const create = useData((s) => s.create);
  const [q, setQ] = useState('');

  const { pinned, rest, total } = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = alive(notes)
      .filter((n) => n.title.trim() || n.body.trim())
      .filter((n) => !query || n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { pinned: list.filter((n) => n.pinned), rest: list.filter((n) => !n.pinned), total: list.length };
  }, [notes, q]);

  const newNote = () => {
    const n = create('notes', {});
    router.push({ pathname: '/note/[id]', params: { id: n.id } });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle
          kicker={`${total} ENTRIES · FIELD JOURNAL`}
          title="NOTES"
          right={<IconBtn icon="create-outline" accentFill onPress={newNote} />}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 46,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 20,
          }}
        >
          <Ionicons name="search" size={17} color={c.textFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search notes"
            placeholderTextColor={c.textFaint}
            selectionColor={accent}
            style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.text, height: '100%' }}
          />
          {q ? (
            <Press onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={c.textFaint} />
            </Press>
          ) : null}
        </View>

        {total === 0 ? (
          q ? (
            <Empty icon="search" title="NO MATCH" text={`Nothing found for “${q}”.`} />
          ) : (
            <Empty
              icon="reader-outline"
              title="EMPTY JOURNAL"
              text="Ideas, lessons, reflections. Write it down — what gets written gets done."
              action="WRITE FIRST NOTE"
              onAction={newNote}
            />
          )
        ) : null}

        {pinned.length ? (
          <>
            <Section label="PINNED" count={pinned.length} style={{ marginBottom: 12 }} />
            <Grid notes={pinned} />
          </>
        ) : null}
        {rest.length ? (
          <>
            {pinned.length ? <Section label="ALL NOTES" count={rest.length} style={{ marginTop: 22, marginBottom: 12 }} /> : null}
            <Grid notes={rest} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Grid({ notes }: { notes: Note[] }) {
  const left = notes.filter((_, i) => i % 2 === 0);
  const right = notes.filter((_, i) => i % 2 === 1);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1, gap: 10 }}>
        {left.map((n, i) => (
          <NoteCard key={n.id} note={n} index={i * 2} />
        ))}
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        {right.map((n, i) => (
          <NoteCard key={n.id} note={n} index={i * 2 + 1} />
        ))}
      </View>
    </View>
  );
}

function NoteCard({ note, index }: { note: Note; index: number }) {
  const { c, accent } = useTheme();
  const today = todayKey();
  const day = isoToKey(note.updated_at) ?? today;
  const when = day === today ? fmtClock(note.updated_at) : relativeLabel(day, today);
  const lines = Math.min(8, 3 + (note.body.length % 5));
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(350)}>
      <Press
        scaleTo={0.97}
        onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
        style={{
          padding: 14,
          borderRadius: 16,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: note.pinned ? alpha(accent, 0.4) : c.border,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {note.pinned ? <Ionicons name="pin" size={11} color={accent} /> : null}
          <Txt variant="label" style={{ fontSize: 9 }}>
            {when}
          </Txt>
        </View>
        {note.title ? (
          <Txt variant="title" numberOfLines={2} style={{ fontSize: 15.5 }}>
            {note.title}
          </Txt>
        ) : null}
        {note.body ? (
          <Txt variant="small" color={c.textDim} numberOfLines={lines}>
            {note.body}
          </Txt>
        ) : null}
      </Press>
    </Animated.View>
  );
}
