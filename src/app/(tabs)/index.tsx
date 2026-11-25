import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PulseDot } from '@/components/bits';
import { DoneToggle, QuickAdd } from '@/components/ListBits';
import { ProgressRing } from '@/components/ProgressRing';
import { TaskRow } from '@/components/TaskRow';
import { Card, IconBtn, Press, ProgressBar, Screen, Section, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import { dayNum, fmtDuration, fmtMin, minutesNow, monthShort, todayKey, weekday } from '@/lib/date';
import { mantraOfTheDay } from '@/lib/quotes';
import { useNow } from '@/lib/useNow';
import { levelInfo } from '@/lib/xp';
import { useData, type Block } from '@/store/data';
import { useSync } from '@/store/sync';
import { activeDays, blockNow, blocksForDay, currentStreak, tasksForDay, totalXp } from '@/store/selectors';
import { alpha, useTheme } from '@/theme';

/**
 * Today = one question: what do I do today?
 * Progress at a glance, what's on the schedule right now, and today's tasks.
 */
export default function TodayScreen() {
  const { c, accent } = useTheme();
  const tasks = useData((s) => s.tasks);
  const blocks = useData((s) => s.blocks);
  const goals = useData((s) => s.goals);
  const create = useData((s) => s.create);
  const [showDone, setShowDone] = useState(false);
  const syncError = useSync((s) => s.status === 'error');
  useNow(30000);

  const today = todayKey();
  const nowMin = minutesNow();
  const { open, done, dayBlocks, xp, streak } = useMemo(() => {
    const day = tasksForDay(tasks, today);
    return {
      ...day,
      dayBlocks: blocksForDay(blocks, today),
      xp: totalXp(tasks, blocks, goals),
      streak: currentStreak(activeDays(tasks, blocks, goals), today),
    };
  }, [tasks, blocks, goals, today]);

  const lvl = levelInfo(xp);
  const total = open.length + done.length;
  const { current, upcoming } = blockNow(dayBlocks, nowMin);
  const headline = total === 0 ? 'NO TASKS YET' : open.length === 0 ? 'ALL DONE' : `${open.length} TO GO`;

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6 }}>
            <Txt variant="label" color={c.text} style={{ flex: 1 }}>
              {weekday(today)} · {dayNum(today)} {monthShort(today)}
            </Txt>
            <View>
              <IconBtn icon="person-outline" size={36} onPress={() => router.push('/settings')} />
              {syncError ? (
                <View style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: c.danger, borderWidth: 2, borderColor: c.bg }} />
              ) : null}
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(450)}>
            <Txt variant="display" size={48} adjustsFontSizeToFit numberOfLines={2} style={{ marginTop: 14 }}>
              {mantraOfTheDay()}
              <Text style={{ color: accent }}>.</Text>
            </Txt>
          </Animated.View>

          {/* Progress at a glance */}
          <Animated.View entering={FadeInDown.delay(70).duration(450)}>
            <Card style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <ProgressRing value={total ? done.length / total : 0} size={84} stroke={8}>
                <Txt variant="h2" style={{ marginTop: 3 }}>
                  {done.length}/{total}
                </Txt>
              </ProgressRing>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt variant="h2">{headline}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="flame" size={14} color={streak ? accent : c.textFaint} />
                  <Txt variant="small" color={streak ? c.text : c.textDim}>
                    {streak ? `${streak}-day streak` : 'Finish a task to start a streak'}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  <Txt variant="label" color={accent} style={{ flex: 1 }}>
                    LVL {lvl.level} · {lvl.rank}
                  </Txt>
                  <Txt variant="label">
                    {lvl.into}/{lvl.span} XP
                  </Txt>
                </View>
                <ProgressBar value={lvl.progress} height={4} />
              </View>
            </Card>
          </Animated.View>

          {/* What's on the schedule — only shown when there's a plan today */}
          {current || upcoming[0] ? (
            <Animated.View entering={FadeInDown.delay(140).duration(450)}>
              <ScheduleLine block={current ?? upcoming[0]} isNow={!!current} nowMin={nowMin} />
            </Animated.View>
          ) : null}

          {/* Today's tasks */}
          <Section label="TODAY'S TASKS" count={`${done.length}/${total}`} style={{ marginTop: 26, marginBottom: 12 }} />
          <QuickAdd
            placeholder={total ? 'Add a task…' : 'What has to get done today?'}
            onAdd={(title) => create('tasks', { title, due_date: today })}
          />
          <View style={{ gap: 8, marginTop: 8 }}>
            {open.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </View>
          {total === 0 ? (
            <Txt variant="small" color={c.textFaint} style={{ marginTop: 14, textAlign: 'center' }}>
              Type your first task above and hit return.
            </Txt>
          ) : null}
          <View style={{ marginTop: 6 }}>
            <DoneToggle count={done.length} open={showDone} onToggle={() => setShowDone((v) => !v)} />
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

/** One line: what you should be doing now (or what's next). Tap to open the plan. */
function ScheduleLine({ block, isNow, nowMin }: { block: Block; isNow: boolean; nowMin: number }) {
  const { c, accent } = useTheme();
  const col = blockColor(block.category, accent);
  const title = block.title || BLOCK_CATEGORIES[block.category].label;
  const progress = (nowMin - block.start_min) / Math.max(1, block.end_min - block.start_min);
  return (
    <Press
      scaleTo={0.98}
      onPress={() => router.navigate('/plan')}
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: isNow ? alpha(col, 0.45) : c.border,
        backgroundColor: isNow ? alpha(col, 0.08) : c.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {isNow ? <PulseDot color={col} /> : <Ionicons name="time-outline" size={16} color={c.textDim} />}
        <View style={{ flex: 1 }}>
          <Txt variant="label" color={isNow ? col : c.textDim}>
            {isNow ? `NOW · ${fmtDuration(block.end_min - nowMin)} LEFT` : `NEXT · ${fmtMin(block.start_min)}`}
          </Txt>
          <Txt variant="title" numberOfLines={1} style={{ marginTop: 2 }}>
            {title}
          </Txt>
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
      </View>
      {isNow ? <ProgressBar value={progress} color={col} height={3} track={alpha(col, 0.18)} style={{ marginTop: 12 }} /> : null}
    </Press>
  );
}
