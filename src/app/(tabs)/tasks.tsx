import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { TaskRow } from '@/components/TaskRow';
import { Chip, Empty, IconBtn, Press, Screen, ScreenTitle, Section, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { addDays, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useData, type Task } from '@/store/data';
import { alive, sortTasks } from '@/store/selectors';
import { fonts, useTheme } from '@/theme';

type Filter = 'today' | 'next' | 'inbox' | 'done';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'today', label: 'TODAY' },
  { key: 'next', label: 'UPCOMING' },
  { key: 'inbox', label: 'INBOX' },
  { key: 'done', label: 'DONE' },
];

export default function TasksScreen() {
  const { c, accent } = useTheme();
  const tasks = useData((s) => s.tasks);
  const create = useData((s) => s.create);
  const [filter, setFilter] = useState<Filter>('today');
  const [quick, setQuick] = useState('');
  const today = todayKey();

  const { groups, counts } = useMemo(() => {
    const list = alive(tasks);
    const open = list.filter((t) => !t.done);
    const todayList = open.filter((t) => t.due_date && t.due_date <= today).sort(sortTasks);
    const next = open.filter((t) => t.due_date && t.due_date > today);
    const inbox = open.filter((t) => !t.due_date).sort(sortTasks);
    const done = list
      .filter((t) => t.done)
      .sort((a, b) => ((a.done_at ?? '') < (b.done_at ?? '') ? 1 : -1))
      .slice(0, 150);

    const doneToday = list
      .filter((t) => t.done && isoToKey(t.done_at) === today)
      .sort((a, b) => ((a.done_at ?? '') < (b.done_at ?? '') ? 1 : -1));
    const counts = { today: todayList.length, next: next.length, inbox: inbox.length, done: done.length };
    let groups: { title?: string; items: Task[] }[] = [];
    if (filter === 'today') {
      const overdue = todayList.filter((t) => t.due_date! < today);
      const due = todayList.filter((t) => t.due_date === today);
      groups = [
        ...(overdue.length ? [{ title: 'OVERDUE', items: overdue }] : []),
        ...(due.length ? [{ title: overdue.length ? 'DUE TODAY' : undefined, items: due }] : []),
        ...(doneToday.length ? [{ title: 'COMPLETED TODAY', items: doneToday }] : []),
      ];
    } else if (filter === 'next') {
      const byDay = new Map<string, Task[]>();
      for (const t of next) byDay.set(t.due_date!, [...(byDay.get(t.due_date!) ?? []), t]);
      groups = [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, items]) => ({ title: relativeLabel(day, today), items: items.sort(sortTasks) }));
    } else if (filter === 'inbox') {
      groups = inbox.length ? [{ items: inbox }] : [];
    } else {
      const byDay = new Map<string, Task[]>();
      for (const t of done) {
        const k = isoToKey(t.done_at) ?? today;
        byDay.set(k, [...(byDay.get(k) ?? []), t]);
      }
      groups = [...byDay.entries()].map(([day, items]) => ({ title: relativeLabel(day, today), items }));
    }
    return { groups, counts };
  }, [tasks, filter, today]);

  const addQuick = () => {
    const title = quick.trim();
    if (!title) return;
    const due = filter === 'inbox' ? null : filter === 'next' ? addDays(today, 1) : today;
    create('tasks', { title, due_date: due });
    haptic.medium();
    setQuick('');
  };

  const empty = {
    today: { icon: 'checkmark-done' as const, title: 'CLEAR SKIES', text: 'Nothing due. Add a mission or pull one from the inbox.' },
    next: { icon: 'calendar-outline' as const, title: 'NOTHING AHEAD', text: 'Schedule missions for upcoming days.' },
    inbox: { icon: 'file-tray-outline' as const, title: 'INBOX ZERO', text: 'Dump ideas here without a date. Sort them later.' },
    done: { icon: 'trophy-outline' as const, title: 'NO WINS YET', text: 'Completed missions land here. Go get the first one.' },
  }[filter];

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenTitle
            kicker={`${counts.today} DUE · ${counts.inbox} IN INBOX`}
            title="MISSIONS"
            right={
              <IconBtn
                icon="add"
                accentFill
                onPress={() =>
                  router.push({
                    pathname: '/task/[id]',
                    params: { id: 'new', due: filter === 'inbox' ? 'none' : filter === 'next' ? addDays(today, 1) : today },
                  })
                }
              />
            }
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => (
              <Chip
                key={f.key}
                label={`${f.label}${f.key !== 'done' && counts[f.key] ? ` · ${counts[f.key]}` : ''}`}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            ))}
          </ScrollView>

          {filter !== 'done' ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginTop: 16,
                paddingHorizontal: 14,
                height: 52,
                borderRadius: 14,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Ionicons name="add" size={22} color={accent} />
              <TextInput
                value={quick}
                onChangeText={setQuick}
                onSubmitEditing={addQuick}
                placeholder={
                  filter === 'inbox' ? 'Capture an idea…' : filter === 'next' ? 'Add a mission for tomorrow…' : 'Add a mission for today…'
                }
                placeholderTextColor={c.textFaint}
                selectionColor={accent}
                returnKeyType="done"
                submitBehavior="submit"
                style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15.5, color: c.text, height: '100%' }}
              />
              {quick.trim() ? (
                <Press onPress={addQuick} tapHaptic>
                  <Txt variant="label" color={accent}>
                    ADD
                  </Txt>
                </Press>
              ) : null}
            </View>
          ) : null}

          {groups.length === 0 ? (
            <Empty icon={empty.icon} title={empty.title} text={empty.text} />
          ) : (
            groups.map((g, i) => (
              <View key={`${g.title ?? 'all'}-${i}`} style={{ marginTop: 22 }}>
                {g.title ? (
                  <Section
                    label={g.title}
                    count={g.items.length}
                    style={{ marginBottom: 10 }}
                  />
                ) : null}
                <View style={{ gap: 8 }}>
                  {g.items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      showDue={filter === 'today' ? t.due_date !== today : filter === 'inbox'}
                      compact={t.done}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
