import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PulseDot, SyncBadge } from '@/components/bits';
import { ProgressRing } from '@/components/ProgressRing';
import { TaskRow } from '@/components/TaskRow';
import { Card, IconBtn, Press, ProgressBar, Screen, Section, TAB_BAR_SPACE, Txt, type IconName } from '@/components/ui';
import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import { dayNum, fmtDuration, fmtMin, greeting, minutesNow, monthShort, todayKey, weekday } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { mantraOfTheDay } from '@/lib/quotes';
import { useNow } from '@/lib/useNow';
import { levelInfo } from '@/lib/xp';
import { toggleBlock } from '@/store/actions';
import { useData, type Block } from '@/store/data';
import { activeDays, blockNow, blocksForDay, currentStreak, tasksForDay, totalXp } from '@/store/selectors';
import { useSettings } from '@/store/settings';
import { alpha, fonts, useTheme } from '@/theme';

export default function TodayScreen() {
  const { c, accent } = useTheme();
  const tasks = useData((s) => s.tasks);
  const blocks = useData((s) => s.blocks);
  const goals = useData((s) => s.goals);
  const create = useData((s) => s.create);
  const name = useSettings((s) => s.name);
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
  const blocksDone = dayBlocks.filter((b) => b.done).length;
  const totalMissions = open.length + done.length;
  const totalUnits = totalMissions + dayBlocks.length;
  const score = totalUnits ? (done.length + blocksDone) / totalUnits : 0;
  const { current, upcoming } = blockNow(dayBlocks, nowMin);

  const [quick, setQuick] = useState('');
  const addQuick = () => {
    const title = quick.trim();
    if (!title) return;
    create('tasks', { title, due_date: today });
    haptic.medium();
    setQuick('');
  };

  const mantra = mantraOfTheDay();

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 }}>
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={c.text}>
                {weekday(today)} · {dayNum(today)} {monthShort(today)}
              </Txt>
              <Txt variant="label" style={{ marginTop: 3 }}>
                {greeting()}, {(name || 'SOLDIER').toUpperCase()}
              </Txt>
            </View>
            <SyncBadge />
            <IconBtn icon="person-outline" size={36} onPress={() => router.push('/settings')} />
          </View>

          <Animated.View entering={FadeInDown.duration(500)}>
            <Txt variant="hero" adjustsFontSizeToFit numberOfLines={2} style={{ marginTop: 22 }}>
              {mantra}
              <Text style={{ color: accent }}>.</Text>
            </Txt>
          </Animated.View>

          {/* Score */}
          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <Card style={{ marginTop: 20, padding: 18, overflow: 'hidden' }}>
              <LinearGradient
                colors={[alpha(accent, 0.13), alpha(accent, 0)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 0.8 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <ProgressRing value={score} size={116} stroke={10}>
                  <Txt variant="display" style={{ fontSize: 38, lineHeight: 40, marginTop: 4 }}>
                    {Math.round(score * 100)}
                    <Text style={{ fontSize: 20, color: c.textDim }}>%</Text>
                  </Txt>
                  <Txt variant="label" style={{ fontSize: 8.5, marginTop: -2 }}>
                    DAY SCORE
                  </Txt>
                </ProgressRing>
                <View style={{ flex: 1, gap: 9 }}>
                  <Stat icon="checkbox-outline" label="MISSIONS" value={`${done.length}/${totalMissions}`} />
                  <Stat icon="time-outline" label="BLOCKS" value={`${blocksDone}/${dayBlocks.length}`} />
                  <Stat
                    icon="flame"
                    label="STREAK"
                    value={`${streak}D`}
                    highlight={streak > 0}
                  />
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: c.border, marginVertical: 16 }} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 9 }}>
                <Txt variant="h2" color={accent}>
                  LVL {lvl.level}
                </Txt>
                <Txt variant="label" color={c.text} style={{ marginLeft: 10, marginBottom: 4 }}>
                  {lvl.rank}
                </Txt>
                <View style={{ flex: 1 }} />
                <Txt variant="label" style={{ marginBottom: 4 }}>
                  {lvl.into}/{lvl.span} XP
                </Txt>
              </View>
              <ProgressBar value={lvl.progress} height={5} />
            </Card>
          </Animated.View>

          {/* Now */}
          <Animated.View entering={FadeInDown.delay(160).duration(500)}>
            <NowCard current={current} upcoming={upcoming} nowMin={nowMin} hasPlan={dayBlocks.length > 0} />
          </Animated.View>

          {/* Missions */}
          <Section
            label="TODAY'S MISSIONS"
            count={`${done.length}/${totalMissions}`}
            action="+ NEW"
            onAction={() => router.push({ pathname: '/task/[id]', params: { id: 'new', due: today } })}
            style={{ marginTop: 28, marginBottom: 12 }}
          />
          <View style={{ gap: 8 }}>
            {open.map((t) => (
              <TaskRow key={t.id} task={t} showDue={t.due_date !== today} />
            ))}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                height: 52,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: c.borderStrong,
              }}
            >
              <Ionicons name="add" size={22} color={accent} />
              <TextInput
                value={quick}
                onChangeText={setQuick}
                onSubmitEditing={addQuick}
                placeholder={totalMissions ? 'Add another mission…' : 'What has to get done today?'}
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
            {done.map((t) => (
              <TaskRow key={t.id} task={t} showDue={false} compact />
            ))}
          </View>
          {totalMissions === 0 ? (
            <Txt variant="small" color={c.textFaint} style={{ marginTop: 12, textAlign: 'center' }}>
              No missions set. A day without targets is a day wasted.
            </Txt>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: IconName;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const { c, accent } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={14} color={highlight ? accent : c.textFaint} />
      <Txt variant="label" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="h2" color={highlight ? accent : c.text} style={{ fontSize: 22 }}>
        {value}
      </Txt>
    </View>
  );
}

function NowCard({
  current,
  upcoming,
  nowMin,
  hasPlan,
}: {
  current: Block | null;
  upcoming: Block[];
  nowMin: number;
  hasPlan: boolean;
}) {
  const { c, accent } = useTheme();
  const next = upcoming.slice(0, current ? 2 : 3);

  return (
    <View style={{ marginTop: 14 }}>
      {current ? (
        <CurrentBlock block={current} nowMin={nowMin} />
      ) : (
        <Press
          scaleTo={0.98}
          onPress={() => router.navigate('/plan')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: alpha(accent, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={hasPlan ? 'pause' : 'time-outline'} size={19} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="label">{hasPlan ? 'NOTHING SCHEDULED RIGHT NOW' : 'NO PLAN FOR TODAY'}</Txt>
            <Txt variant="title" style={{ marginTop: 3 }}>
              {hasPlan
                ? next[0]
                  ? `Next up in ${fmtDuration(next[0].start_min - nowMin)}`
                  : 'Day plan complete'
                : 'Block out your day →'}
            </Txt>
          </View>
        </Press>
      )}
      {next.length ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          {next.map((b) => {
            const col = blockColor(b.category, accent);
            return (
              <Press
                key={b.id}
                scaleTo={0.98}
                onPress={() => router.push({ pathname: '/block/[id]', params: { id: b.id } })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Txt variant="mono" color={c.textDim} style={{ width: 44 }}>
                  {fmtMin(b.start_min)}
                </Txt>
                <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: col }} />
                <Txt variant="title" numberOfLines={1} style={{ flex: 1, fontSize: 14.5 }}>
                  {b.title || BLOCK_CATEGORIES[b.category].label}
                </Txt>
                <Txt variant="label" style={{ fontSize: 9.5 }}>
                  {fmtDuration(b.end_min - b.start_min)}
                </Txt>
              </Press>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function CurrentBlock({ block, nowMin }: { block: Block; nowMin: number }) {
  const { c, accent, onAccent } = useTheme();
  const col = blockColor(block.category, accent);
  const progress = (nowMin - block.start_min) / Math.max(1, block.end_min - block.start_min);
  const left = block.end_min - nowMin;
  const cat = BLOCK_CATEGORIES[block.category];
  return (
    <Press
      scaleTo={0.985}
      onPress={() => router.push({ pathname: '/block/[id]', params: { id: block.id } })}
      style={{
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: alpha(col, 0.45),
        backgroundColor: alpha(col, 0.09),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PulseDot color={col} />
        <Txt variant="label" color={col}>
          NOW · {cat.label}
        </Txt>
        <View style={{ flex: 1 }} />
        <Txt variant="label" color={c.text}>
          {fmtDuration(left)} LEFT
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt variant="h1" numberOfLines={2}>
            {block.title || cat.label}
          </Txt>
          <Txt variant="mono" color={c.textDim} style={{ marginTop: 4 }}>
            {fmtMin(block.start_min)} — {fmtMin(block.end_min)}
          </Txt>
        </View>
        <Press
          tapHaptic={false}
          scaleTo={0.9}
          onPress={() => toggleBlock(block.id)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: block.done ? col : 'transparent',
            borderWidth: 2,
            borderColor: col,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark-sharp" size={24} color={block.done ? onAccent : col} />
        </Press>
      </View>
      <ProgressBar value={progress} color={col} height={4} track={alpha(col, 0.18)} style={{ marginTop: 14 }} />
    </Press>
  );
}
