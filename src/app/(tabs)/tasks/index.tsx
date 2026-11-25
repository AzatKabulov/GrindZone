import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Segmented } from '@/components/fields';
import { HeaderActions } from '@/components/header';
import { QuickAdd } from '@/components/QuickAdd';
import { TASK_INSET, TaskRow } from '@/components/TaskRow';
import { Empty, ListSection, ScrollScreen, SectionHeader } from '@/components/ui';
import { addDays, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { useData, type Task } from '@/store/data';
import { alive, sortTasks } from '@/store/selectors';
import { useTheme } from '@/theme';

const FILTERS = ['Today', 'Upcoming', 'Inbox', 'Done'] as const;

interface Group {
  title?: string;
  tone?: 'danger';
  items: Task[];
  add?: string | null | undefined;
}

export default function TasksScreen() {
  const { c } = useTheme();
  const tasks = useData((s) => s.tasks);
  const [filter, setFilter] = useState(0);
  const today = todayKey();
  const tomorrow = addDays(today, 1);

  const groups = useMemo<Group[]>(() => {
    const list = alive(tasks);
    const open = list.filter((t) => !t.done);
    const byDoneDesc = (a: Task, b: Task) => ((a.done_at ?? '') < (b.done_at ?? '') ? 1 : -1);

    if (filter === 0) {
      const overdue = open.filter((t) => t.due_date && t.due_date < today).sort(sortTasks);
      const due = open.filter((t) => t.due_date === today).sort(sortTasks);
      const doneToday = list.filter((t) => t.done && isoToKey(t.done_at) === today).sort(byDoneDesc);
      return [
        ...(overdue.length ? [{ title: 'Overdue', tone: 'danger' as const, items: overdue }] : []),
        { title: overdue.length ? 'Today' : undefined, items: due, add: today },
        ...(doneToday.length ? [{ title: 'Completed', items: doneToday }] : []),
      ];
    }
    if (filter === 1) {
      const byDay = new Map<string, Task[]>();
      for (const t of open.filter((t) => t.due_date && t.due_date > today)) {
        byDay.set(t.due_date!, [...(byDay.get(t.due_date!) ?? []), t]);
      }
      if (!byDay.has(tomorrow)) byDay.set(tomorrow, []);
      return [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, items]) => ({
          title: relativeLabel(day, today),
          items: items.sort(sortTasks),
          add: day === tomorrow ? tomorrow : undefined,
        }));
    }
    if (filter === 2) {
      return [{ items: open.filter((t) => !t.due_date).sort(sortTasks), add: null }];
    }
    const byDay = new Map<string, Task[]>();
    for (const t of list.filter((t) => t.done).sort(byDoneDesc).slice(0, 200)) {
      const k = isoToKey(t.done_at) ?? today;
      byDay.set(k, [...(byDay.get(k) ?? []), t]);
    }
    return [...byDay.entries()].map(([day, items]) => ({ title: relativeLabel(day, today), items }));
  }, [tasks, filter, today, tomorrow]);

  const newTask = () =>
    router.push({
      pathname: '/task/[id]',
      params: { id: 'new', due: filter === 2 ? 'none' : filter === 1 ? tomorrow : today },
    });

  const nothingDone = filter === 3 && groups.length === 0;

  return (
    <>
      <HeaderActions right={[{ key: 'add', label: 'New Task', icon: 'plus', onPress: newTask }]} />
      <ScrollScreen>
        <View style={{ marginTop: 6, marginBottom: 18 }}>
          <Segmented values={[...FILTERS]} index={filter} onChange={setFilter} />
        </View>
        {nothingDone ? (
          <Empty icon="trophy" title="No Completed Tasks" text="Finished tasks show up here. Go get the first one." />
        ) : (
          groups.map((g, i) => (
            <View key={`${g.title ?? 'all'}-${i}`} style={{ marginBottom: 24 }}>
              {g.title ? (
                <SectionHeader
                  title={g.title}
                  detail={g.items.length ? String(g.items.length) : undefined}
                  color={g.tone === 'danger' ? c.red : undefined}
                />
              ) : null}
              <ListSection inset={TASK_INSET}>
                {g.items.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    showDue={filter === 0 && t.due_date !== today}
                  />
                ))}
                {g.add !== undefined ? (
                  <QuickAdd day={g.add} placeholder={filter === 2 ? 'Capture an idea' : 'New Task'} />
                ) : null}
              </ListSection>
            </View>
          ))
        )}
        {filter === 0 && groups.every((g) => g.items.length === 0) ? (
          <Empty icon="checkCircle" title="All Clear" text="Nothing due today. Add a task above or pull one from the Inbox." />
        ) : null}
      </ScrollScreen>
    </>
  );
}
