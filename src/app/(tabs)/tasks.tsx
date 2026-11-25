import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { DoneToggle, QuickAdd } from '@/components/ListBits';
import { TaskRow } from '@/components/TaskRow';
import { IconBtn, Screen, ScreenTitle, Section, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { useData, type Task } from '@/store/data';
import { alive, sortTasks } from '@/store/selectors';
import { useTheme } from '@/theme';

/** Every open task in one list: Overdue → Today → Upcoming → Someday. Finished ones stay tucked away. */
export default function TasksScreen() {
  const { c } = useTheme();
  const tasks = useData((s) => s.tasks);
  const create = useData((s) => s.create);
  const [showDone, setShowDone] = useState(false);
  const today = todayKey();

  const { sections, done, openCount } = useMemo(() => {
    const list = alive(tasks);
    const open = list.filter((t) => !t.done);
    const byDate = (a: Task, b: Task) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : sortTasks(a, b));
    const sections: { title: string; items: Task[]; showDue: boolean }[] = [
      { title: 'OVERDUE', items: open.filter((t) => t.due_date && t.due_date < today).sort(byDate), showDue: true },
      { title: 'TODAY', items: open.filter((t) => t.due_date === today).sort(sortTasks), showDue: false },
      { title: 'UPCOMING', items: open.filter((t) => t.due_date && t.due_date > today).sort(byDate), showDue: true },
      { title: 'SOMEDAY', items: open.filter((t) => !t.due_date).sort(sortTasks), showDue: false },
    ];
    const done = list
      .filter((t) => t.done)
      .sort((a, b) => ((a.done_at ?? '') < (b.done_at ?? '') ? 1 : -1))
      .slice(0, 50);
    return { sections: sections.filter((s) => s.items.length), done, openCount: open.length };
  }, [tasks, today]);

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenTitle
            kicker={openCount ? `${openCount} OPEN` : 'ALL CLEAR'}
            title="TASKS"
            right={<IconBtn icon="add" accentFill onPress={() => router.push({ pathname: '/task/[id]', params: { id: 'new', due: today } })} />}
          />

          <QuickAdd placeholder="Add a task for today…" onAdd={(title) => create('tasks', { title, due_date: today })} />

          {sections.length === 0 ? (
            <Txt variant="small" color={c.textFaint} style={{ marginTop: 18, textAlign: 'center' }}>
              Nothing open. Add a task above, or tap + to pick a date.
            </Txt>
          ) : null}

          {sections.map((s) => (
            <View key={s.title} style={{ marginTop: 24 }}>
              <Section label={s.title} count={s.items.length} style={{ marginBottom: 10 }} />
              <View style={{ gap: 8 }}>
                {s.items.map((t) => (
                  <TaskRow key={t.id} task={t} showDue={s.showDue} />
                ))}
              </View>
            </View>
          ))}

          <View style={{ marginTop: 18 }}>
            <DoneToggle count={done.length} open={showDone} onToggle={() => setShowDone((v) => !v)} label="COMPLETED" />
          </View>
          {showDone ? (
            <View style={{ gap: 8 }}>
              {done.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
