import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Empty, IconBtn, Press, Screen, ScreenTitle, Section, Txt } from '@/components/ui';
import { fmtClock, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { useData, type Note } from '@/store/data';
import { alive } from '@/store/selectors';
import { alpha, fonts, useTheme } from '@/theme';

export default function NotesScreen() {
  const { c, accent } = useTheme();
  const notes = useData((s) => s.notes);
  const create = useData((s) => s.create);
  const [q, setQ] = useState('');

  const { pinned, rest, total, all } = useMemo(() => {
    const query = q.trim().toLowerCase();
    const written = alive(notes).filter((n) => n.title.trim() || n.body.trim());
    const list = written
      .filter((n) => !query || n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { pinned: list.filter((n) => n.pinned), rest: list.filter((n) => !n.pinned), total: list.length, all: written.length };
  }, [notes, q]);

  const newNote = () => {
    const n = create('notes', {});
    router.push({ pathname: '/note/[id]', params: { id: n.id } });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Press onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} tapHaptic hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 }}>
          <Ionicons name="chevron-back" size={16} color={accent} />
          <Txt variant="label" color={accent}>
            BACK
          </Txt>
        </Press>
        <ScreenTitle
          kicker={all ? `${all} ${all === 1 ? 'NOTE' : 'NOTES'}` : undefined}
          title="NOTES"
          right={<IconBtn icon="create-outline" accentFill onPress={newNote} />}
        />
        {all > 5 ? (
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
        ) : null}

        {total === 0 ? (
          q ? (
            <Empty icon="search" title="NO MATCH" text={`Nothing found for “${q}”.`} />
          ) : (
            <Empty
              icon="reader-outline"
              title="NO NOTES YET"
              text="Ideas, lessons, plans. Write it down so it doesn't get lost."
              action="NEW NOTE"
              onAction={newNote}
            />
          )
        ) : null}

        {pinned.length ? (
          <>
            <Section label="PINNED" count={pinned.length} style={{ marginBottom: 12 }} />
            <List notes={pinned} />
          </>
        ) : null}
        {rest.length ? (
          <>
            {pinned.length ? <Section label="ALL NOTES" count={rest.length} style={{ marginTop: 22, marginBottom: 12 }} /> : null}
            <List notes={rest} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function List({ notes }: { notes: Note[] }) {
  return (
    <View style={{ gap: 8 }}>
      {notes.map((n, i) => (
        <NoteCard key={n.id} note={n} index={i} />
      ))}
    </View>
  );
}

function NoteCard({ note, index }: { note: Note; index: number }) {
  const { c, accent } = useTheme();
  const today = todayKey();
  const day = isoToKey(note.updated_at) ?? today;
  const when = day === today ? fmtClock(note.updated_at) : relativeLabel(day, today);
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
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {note.pinned ? <Ionicons name="pin" size={12} color={accent} /> : null}
          <Txt variant="title" numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>
            {note.title.trim() || note.body.trim().split('\n')[0]}
          </Txt>
          <Txt variant="label" style={{ fontSize: 9.5 }}>
            {when}
          </Txt>
        </View>
        {note.title.trim() && note.body.trim() ? (
          <Txt variant="small" color={c.textDim} numberOfLines={2}>
            {note.body}
          </Txt>
        ) : null}
      </Press>
    </Animated.View>
  );
}
