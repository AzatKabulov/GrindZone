import { router, Stack } from 'expo-router';
import { memo, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { HeaderActions } from '@/components/header';
import { Icon } from '@/components/Icon';
import { Empty, ListSection, ScrollScreen, Txt } from '@/components/ui';
import { diffDays, fmtClock, isoToKey, monthLong, parseKey, shortDate, todayKey, weekday } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useData, type Note } from '@/store/data';
import { alive } from '@/store/selectors';
import { font, squircle, useTheme } from '@/theme';

function bucket(n: Note, today: string): string {
  const k = isoToKey(n.updated_at) ?? today;
  const d = diffDays(k, today);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d <= 7) return 'Previous 7 Days';
  if (d <= 30) return 'Previous 30 Days';
  const date = parseKey(k);
  return date.getFullYear() === parseKey(today).getFullYear() ? monthLong(date) : String(date.getFullYear());
}

export default function NotesScreen() {
  const { c, accent } = useTheme();
  const notes = useData((s) => s.notes);
  const create = useData((s) => s.create);
  const [q, setQ] = useState('');
  const today = todayKey();

  const { sections, total } = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = alive(notes)
      .filter((n) => n.title.trim() || n.body.trim())
      .filter((n) => !query || n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const map = new Map<string, Note[]>();
    const pinned = list.filter((n) => n.pinned);
    if (pinned.length) map.set('Pinned', pinned);
    for (const n of list.filter((n) => !n.pinned)) {
      const k = bucket(n, today);
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return { sections: [...map.entries()], total: list.length };
  }, [notes, q, today]);

  const newNote = () => {
    const n = create('notes', {});
    router.push({ pathname: '/notes/[id]', params: { id: n.id } });
  };

  return (
    <>
      {Platform.OS === 'ios' ? (
        <Stack.SearchBar placeholder="Search" onChangeText={(e) => setQ(e.nativeEvent.text)} onCancelButtonPress={() => setQ('')} />
      ) : null}
      <HeaderActions right={[{ key: 'new', label: 'New Note', icon: 'compose', onPress: newNote }]} />
      <ScrollScreen>
        {Platform.OS !== 'ios' ? (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 11, backgroundColor: c.fill2, paddingHorizontal: 10, marginTop: 4, marginBottom: 14 }, squircle]}>
            <Icon name="search" size={16} color={c.label2} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search"
              placeholderTextColor={c.label2}
              selectionColor={accent}
              style={{ flex: 1, ...font('400'), fontSize: 17, color: c.label }}
            />
          </View>
        ) : null}

        {total === 0 ? (
          q ? (
            <Empty icon="search" title="No Results" text={`No notes match “${q}”.`} />
          ) : (
            <Empty icon="notes" title="No Notes" text="Lessons, plans, ideas, reflections. What gets written gets done." action="New Note" onAction={newNote} />
          )
        ) : (
          sections.map(([title, list]) => (
            <View key={title} style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4, marginBottom: 8 }}>
                {title === 'Pinned' ? <Icon name="pin" size={14} color={c.orange} /> : null}
                <Txt variant="title3" weight="700">
                  {title}
                </Txt>
              </View>
              <ListSection>
                {list.map((n) => (
                  <NoteRow key={n.id} note={n} today={today} />
                ))}
              </ListSection>
            </View>
          ))
        )}
        {total > 0 ? (
          <Txt variant="footnote" color={c.label2} center style={{ marginTop: 18 }}>
            {total} {total === 1 ? 'Note' : 'Notes'}
          </Txt>
        ) : null}
      </ScrollScreen>
    </>
  );
}

const NoteRow = memo(function NoteRow({ note, today }: { note: Note; today: string }) {
  const { c } = useTheme();
  const swipe = useRef<SwipeableMethods>(null);
  const day = isoToKey(note.updated_at) ?? today;
  const d = diffDays(day, today);
  const when = d <= 0 ? fmtClock(note.updated_at) : d === 1 ? 'Yesterday' : d < 7 ? weekday(day) : shortDate(day);
  const firstLine = note.body.split('\n').find((l) => l.trim()) ?? 'No additional text';

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={1.6}
      leftThreshold={70}
      rightThreshold={70}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={(dir) => {
        haptic.medium();
        swipe.current?.close();
        const s = useData.getState();
        if (dir === SwipeDirection.RIGHT) setTimeout(() => s.patch('notes', note.id, { pinned: !note.pinned }), 120);
        else setTimeout(() => s.remove('notes', note.id), 120);
      }}
      renderLeftActions={() => (
        <View style={{ width: 84, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={note.pinned ? 'pinOff' : 'pin'} size={20} color="#FFFFFF" />
        </View>
      )}
      renderRightActions={() => (
        <View style={{ width: 84, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trashFill" size={19} color="#FFFFFF" />
        </View>
      )}
    >
      <Pressable
        onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
        style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 11, backgroundColor: pressed ? c.fill2 : c.card })}
      >
        <Txt variant="headline" numberOfLines={1}>
          {note.title.trim() || firstLine}
        </Txt>
        <Txt variant="subhead" numberOfLines={1} style={{ marginTop: 2 }}>
          <Txt variant="subhead" color={c.label}>
            {when}
          </Txt>
          <Txt variant="subhead" color={c.label2}>
            {'  '}
            {note.title.trim() ? firstLine : 'No additional text'}
          </Txt>
        </Txt>
      </Pressable>
    </ReanimatedSwipeable>
  );
});
