import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { DoneToggle, QuickAdd } from '@/components/ListBits';
import { ReorderableTasks } from '@/components/ReorderableTasks';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { TaskRow } from '@/components/TaskRow';
import { IconBtn, Screen, ScreenTitle, Section, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { useData, type Task } from '@/store/data';
import { closeSwipes, useDrag } from '@/store/drag';
import { alive, sortTasks, sortTasksByDue } from '@/store/selectors';
import { useTheme } from '@/theme';

const byDay = (t: Task) => t.due_date ?? '';

/** Every open task in one list: Overdue → Today → Upcoming → Someday. Finished ones stay tucked away. */
export default function TasksScreen() {
  const { c } = useTheme();
  const tasks = useData((s) => s.tasks);
  const create = useData((s) => s.create);
  const [showDone, setShowDone] = useState(false);
  const dragging = useDrag((s) => s.dragging);
  const today = todayKey();

  const { sections, done, openCount } = useMemo(() => {
    const list = alive(tasks);
    const open = list.filter((t) => !t.done);
    // Dated sections keep their days in order; you can rearrange tasks within the same day.
    const sections: { title: string; items: Task[]; showDue: boolean; byDay: boolean }[] = [
      { title: 'OVERDUE', items: open.filter((t) => t.due_date && t.due_date < today).sort(sortTasksByDue), showDue: true, byDay: true },
      { title: 'TODAY', items: open.filter((t) => t.due_date === today).sort(sortTasks), showDue: false, byDay: false },
      { title: 'UPCOMING', items: open.filter((t) => t.due_date && t.due_date > today).sort(sortTasksByDue), showDue: true, byDay: true },
      { title: 'SOMEDAY', items: open.filter((t) => !t.due_date).sort(sortTasks), showDue: false, byDay: false },
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
          scrollEnabled={!dragging}
          onScrollBeginDrag={closeSwipes}
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
              <ReorderableTasks tasks={s.items} showDue={s.showDue} groupOf={s.byDay ? byDay : undefined} />
            </View>
          ))}

          <View style={{ marginTop: 18 }}>
            <DoneToggle count={done.length} open={showDone} onToggle={() => setShowDone((v) => !v)} label="COMPLETED" />
          </View>
          {showDone ? (
            <View style={{ gap: 8 }}>
              {done.map((t) => (
                <SwipeToDelete key={t.id} id={t.id}>
                  <TaskRow task={t} />
                </SwipeToDelete>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
