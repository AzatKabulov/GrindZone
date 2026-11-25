import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PulseDot } from '@/components/bits';
import { FocusPill } from '@/components/FocusEngine';
import { Heatmap } from '@/components/Heatmap';
import { DoneToggle, QuickAdd } from '@/components/ListBits';
import { ProgressRing } from '@/components/ProgressRing';
import { ReorderableTasks } from '@/components/ReorderableTasks';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { TaskRow } from '@/components/TaskRow';
import { Button, Card, IconBtn, Press, ProgressBar, Screen, Section, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import { dayNum, fmtDuration, fmtMin, minutesNow, monthShort, todayKey, weekday } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { mantraOfTheDay } from '@/lib/quotes';
import { useNow } from '@/lib/useNow';
import { useData, type Block } from '@/store/data';
import { closeSwipes, useDrag } from '@/store/drag';
import { useFocus } from '@/store/focus';
import { activeDays, activityByDay, blockNow, blocksForDay, currentStreak, tasksForDay } from '@/store/selectors';
import { useSettings } from '@/store/settings';
import { useSync } from '@/store/sync';
import { alpha, fonts, useTheme } from '@/theme';

/**
 * Today = one question: what do I do today?
 * Your line for the day, progress, your activity history, what's on the schedule, and today's tasks.
 */
export default function TodayScreen() {
  const { c, accent } = useTheme();
  const tasks = useData((s) => s.tasks);
  const blocks = useData((s) => s.blocks);
  const goals = useData((s) => s.goals);
  const notes = useData((s) => s.notes);
  const habits = useData((s) => s.habits);
  const create = useData((s) => s.create);
  const focusHistory = useFocus((s) => s.history);
  const customMantra = useSettings((s) => s.customMantra);
  const mantraSize = useSettings((s) => s.mantraSize ?? 48);
  const syncError = useSync((s) => s.status === 'error');
  const [showDone, setShowDone] = useState(false);
  const [editMantra, setEditMantra] = useState(false);
  const dragging = useDrag((s) => s.dragging);
  useNow(30000);

  const today = todayKey();
  const nowMin = minutesNow();
  const { open, done, dayBlocks, streak, activity } = useMemo(() => {
    const day = tasksForDay(tasks, today);
    return {
      ...day,
      dayBlocks: blocksForDay(blocks, today),
      streak: currentStreak(activeDays(tasks, goals, habits, focusHistory), today),
      activity: activityByDay({ tasks, blocks, notes, habits, goals, focus: focusHistory }),
    };
  }, [tasks, blocks, goals, notes, habits, focusHistory, today]);

  const total = open.length + done.length;
  const { current, upcoming } = blockNow(dayBlocks, nowMin);
  const headline = total === 0 ? 'NO TASKS YET' : open.length === 0 ? 'ALL DONE' : `${open.length} TO GO`;
  const activeDaysCount = Object.values(activity).filter((n) => n > 0).length;
  const mantra = customMantra.trim() || mantraOfTheDay();

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!dragging}
          onScrollBeginDrag={closeSwipes}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 }}>
            <Txt variant="label" color={c.text} style={{ flex: 1 }}>
              {weekday(today)} · {dayNum(today)} {monthShort(today)}
            </Txt>
            <IconBtn icon="timer-outline" size={36} onPress={() => router.push('/focus')} />
            <IconBtn icon="reader-outline" size={36} onPress={() => router.push('/notes')} />
            <View>
              <IconBtn icon="person-outline" size={36} onPress={() => router.push('/settings')} />
              {syncError ? (
                <View style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: c.danger, borderWidth: 2, borderColor: c.bg }} />
              ) : null}
            </View>
          </View>

          {/* Your line for the day — tap to write your own */}
          <Animated.View entering={FadeInDown.duration(450)}>
            <Press scaleTo={0.98} onPress={() => setEditMantra(true)} style={{ marginTop: 14 }}>
              <Txt variant="display" size={mantraSize} adjustsFontSizeToFit numberOfLines={3}>
                {mantra.toUpperCase().replace(/[.!]+$/, '')}
                <Text style={{ color: accent }}>.</Text>
              </Txt>
            </Press>
          </Animated.View>

          {/* Progress at a glance */}
          <Animated.View entering={FadeInDown.delay(70).duration(450)}>
            <Card style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <ProgressRing value={total ? done.length / total : 0} size={78} stroke={8}>
                <Txt variant="h2" style={{ marginTop: 3 }}>
                  {done.length}/{total}
                </Txt>
              </ProgressRing>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt variant="h2">{headline}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="flame" size={14} color={streak ? accent : c.textFaint} />
                  <Txt variant="small" color={streak ? c.text : c.textDim}>
                    {streak ? `${streak}-day streak` : 'Finish something to start a streak'}
                  </Txt>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Activity history, GitHub-style */}
          <Animated.View entering={FadeInDown.delay(120).duration(450)}>
            <Card style={{ marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Txt variant="label" color={c.text} style={{ flex: 1 }}>
                  ACTIVITY
                </Txt>
                <Txt variant="label">{activeDaysCount} ACTIVE DAYS</Txt>
              </View>
              <Heatmap counts={activity} weeks={17} />
            </Card>
          </Animated.View>

          <FocusPill />

          {current || upcoming[0] ? <ScheduleLine block={current ?? upcoming[0]} isNow={!!current} nowMin={nowMin} /> : null}

          {/* Today's tasks */}
          <Section label="TODAY'S TASKS" count={`${done.length}/${total}`} style={{ marginTop: 26, marginBottom: 12 }} />
          <QuickAdd placeholder={total ? 'Add a task…' : 'What has to get done today?'} onAdd={(title) => create('tasks', { title, due_date: today })} />
          <View style={{ marginTop: 8 }}>
            <ReorderableTasks tasks={open} />
          </View>
          {total === 0 ? (
            <Txt variant="small" color={c.textFaint} style={{ marginTop: 14, textAlign: 'center' }}>
              Type your first task above and hit return.{'\n'}Hold a task to preview it, hold and drag to move it.
            </Txt>
          ) : null}
          <View style={{ marginTop: 6 }}>
            <DoneToggle count={done.length} open={showDone} onToggle={() => setShowDone((v) => !v)} />
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
      </View>
      {editMantra ? <MantraEditor current={customMantra} onClose={() => setEditMantra(false)} /> : null}
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

const SIZES = [
  { label: 'XS', v: 28 },
  { label: 'S', v: 34 },
  { label: 'M', v: 40 },
  { label: 'L', v: 48 },
  { label: 'XL', v: 56 },
];

/** Write your own line for the top of Today (and pick its size), or go back to the rotating daily quotes. */
function MantraEditor({ current, onClose }: { current: string; onClose: () => void }) {
  const { c, accent, onAccent, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const set = useSettings((s) => s.set);
  const [text, setText] = useState(current || mantraOfTheDay());
  const [size, setSize] = useState(useSettings.getState().mantraSize ?? 48);
  const save = () => {
    set({ customMantra: text.trim(), mantraSize: size });
    haptic.success();
    onClose();
  };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: c.border,
            padding: 20,
            paddingBottom: insets.bottom + 16,
            gap: 14,
          }}
        >
          <Txt variant="label" color={accent}>
            YOUR LINE FOR THE DAY
          </Txt>
          {/* Typed at the chosen size, so this is exactly how it will look on Today */}
          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            multiline
            maxLength={60}
            placeholder="e.g. EARN YOUR SLEEP"
            placeholderTextColor={c.textFaint}
            selectionColor={accent}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.05, color: c.text, paddingVertical: 4, textTransform: 'uppercase' }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt variant="label" style={{ marginRight: 4 }}>
              SIZE
            </Txt>
            {SIZES.map((o, i) => (
              <Pressable
                key={o.v}
                onPress={() => {
                  haptic.tap();
                  setSize(o.v);
                }}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: size === o.v ? accent : c.surface2,
                  borderWidth: 1,
                  borderColor: size === o.v ? accent : c.border,
                }}
              >
                <Text style={{ fontFamily: fonts.display, fontSize: 12 + i * 3.5, color: size === o.v ? onAccent : c.text }}>A</Text>
              </Pressable>
            ))}
          </View>
          <Button label="SAVE" icon="checkmark" onPress={save} disabled={!text.trim()} />
          {current ? (
            <Button
              label="USE DAILY QUOTES"
              icon="shuffle"
              variant="outline"
              small
              onPress={() => {
                set({ customMantra: '', mantraSize: size });
                haptic.light();
                onClose();
              }}
            />
          ) : (
            <Txt variant="small" color={c.textFaint} style={{ textAlign: 'center' }}>
              Until you set your own, a new line shows up every day.
            </Txt>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
