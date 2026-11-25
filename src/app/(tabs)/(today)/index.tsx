import { router } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { QuickAdd } from '@/components/QuickAdd';
import { Rings } from '@/components/Rings';
import { TASK_INSET, TaskRow } from '@/components/TaskRow';
import { Avatar, Card, ListSection, Press, ProgressBar, ScrollScreen, SectionHeader, Txt } from '@/components/ui';
import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import { fmtDuration, fmtMin, longDate, minutesNow, todayKey } from '@/lib/date';
import { mantraOfTheDay } from '@/lib/quotes';
import { useNow } from '@/lib/useNow';
import { levelInfo } from '@/lib/xp';
import { toggleBlock } from '@/store/actions';
import { useAuth } from '@/store/auth';
import { useData, type Block } from '@/store/data';
import { activeDays, blockNow, blocksForDay, currentStreak, tasksForDay, totalXp } from '@/store/selectors';
import { useSettings } from '@/store/settings';
import { alpha, shade, squircle, useTheme } from '@/theme';

export default function TodayScreen() {
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const tasks = useData((s) => s.tasks);
  const blocks = useData((s) => s.blocks);
  const goals = useData((s) => s.goals);
  const name = useSettings((s) => s.name);
  const email = useAuth((s) => s.session?.user.email);
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
  const totalTasks = open.length + done.length;
  const { current, upcoming } = blockNow(dayBlocks, nowMin);

  return (
    <ScrollScreen contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 8 : insets.top + 12 }}>
      {/* App Store–style header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4 }}>
        <View style={{ flex: 1 }}>
          <Txt variant="footnote" weight="600" color={c.label2} style={{ textTransform: 'uppercase' }}>
            {longDate(today)}
          </Txt>
          <Txt variant="largeTitle">Today</Txt>
        </View>
        <Press onPress={() => router.push('/settings')} scaleTo={0.9} hitSlop={8} style={{ marginBottom: 4 }}>
          <Avatar name={name || email || 'G'} size={38} />
        </Press>
      </View>
      <Txt design="serif" italic weight="500" size={21} color={c.label2} style={{ marginTop: 6, paddingHorizontal: 4, lineHeight: 27 }}>
        {mantraOfTheDay()}
      </Txt>

      {/* Activity summary */}
      <Animated.View entering={FadeInDown.duration(450)}>
        <Card style={{ marginTop: 18, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <Rings
              size={128}
              stroke={15}
              rings={[
                { value: totalTasks ? done.length / totalTasks : 0, colors: [shade(accent, 0.3), accent] },
                { value: dayBlocks.length ? blocksDone / dayBlocks.length : 0, colors: [c.mint, c.cyan] },
              ]}
            />
            <View style={{ flex: 1, gap: 10 }}>
              <Metric label="Tasks" value={`${done.length}/${totalTasks}`} color={accent} />
              <Metric label="Time Blocks" value={`${blocksDone}/${dayBlocks.length}`} color={c.cyan} />
              <Metric label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} color={c.label} icon={streak > 0} />
            </View>
          </View>
          <View style={{ height: 0.5, backgroundColor: c.separator, marginVertical: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 9 }}>
            <Txt variant="headline">Level {lvl.level}</Txt>
            <Txt variant="headline" weight="400" color={c.label2}>
              {'  '}
              {lvl.rank}
            </Txt>
            <View style={{ flex: 1 }} />
            <Txt variant="footnote" color={c.label2} tabular>
              {lvl.into} / {lvl.span} XP
            </Txt>
          </View>
          <ProgressBar value={lvl.progress} height={5} />
        </Card>
      </Animated.View>

      {/* Now */}
      <Animated.View entering={FadeInDown.delay(80).duration(450)} style={{ marginTop: 14 }}>
        {current ? (
          <NowCard block={current} nowMin={nowMin} />
        ) : (
          <Press onPress={() => router.navigate('/plan')} scaleTo={0.98}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={[{ width: 40, height: 40, borderRadius: 12, backgroundColor: alpha(c.cyan, 0.16), alignItems: 'center', justifyContent: 'center' }, squircle]}>
                <Icon name="clock" size={20} color={c.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="headline">{dayBlocks.length ? 'Nothing scheduled right now' : 'No plan for today'}</Txt>
                <Txt variant="subhead" color={c.label2}>
                  {dayBlocks.length
                    ? upcoming[0]
                      ? `Next at ${fmtMin(upcoming[0].start_min)} · ${upcoming[0].title || BLOCK_CATEGORIES[upcoming[0].category].label}`
                      : 'Your plan for today is complete.'
                    : 'Block out your hours in Plan.'}
                </Txt>
              </View>
              <Icon name="chevronRight" size={13} color={c.label3} weight="semibold" />
            </Card>
          </Press>
        )}
        {upcoming.length && current ? (
          <ListSection style={{ marginTop: 10 }} inset={76}>
            {upcoming.slice(0, 3).map((b) => (
              <UpNextRow key={b.id} block={b} />
            ))}
          </ListSection>
        ) : null}
      </Animated.View>

      {/* Tasks */}
      <Animated.View entering={FadeInDown.delay(160).duration(450)} style={{ marginTop: 28 }}>
        <SectionHeader
          title="Tasks"
          detail={totalTasks ? `${done.length} of ${totalTasks}` : undefined}
          action="Show All"
          onAction={() => router.navigate('/tasks')}
        />
        <ListSection inset={TASK_INSET}>
          {open.map((t) => (
            <TaskRow key={t.id} task={t} showDue={t.due_date !== today} />
          ))}
          <QuickAdd day={today} />
          {done.map((t) => (
            <TaskRow key={t.id} task={t} showDue={false} />
          ))}
        </ListSection>
        {totalTasks === 0 ? (
          <Txt variant="footnote" color={c.label2} center style={{ marginTop: 10 }}>
            A day without targets is a day wasted.
          </Txt>
        ) : null}
      </Animated.View>
    </ScrollScreen>
  );
}

function Metric({ label, value, color, icon }: { label: string; value: string; color: string; icon?: boolean }) {
  const { c } = useTheme();
  return (
    <View>
      <Txt variant="subhead" weight="600" color={c.label}>
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon ? <Icon name="flame" size={18} color={c.orange} /> : null}
        <Txt design="rounded" weight="600" size={24} color={color} tabular style={{ lineHeight: 28 }}>
          {value}
        </Txt>
      </View>
    </View>
  );
}

function NowCard({ block, nowMin }: { block: Block; nowMin: number }) {
  const { c, accent } = useTheme();
  const col = blockColor(block.category, c, accent);
  const cat = BLOCK_CATEGORIES[block.category];
  const progress = (nowMin - block.start_min) / Math.max(1, block.end_min - block.start_min);
  return (
    <Press scaleTo={0.98} onPress={() => router.push({ pathname: '/block/[id]', params: { id: block.id } })}>
      <Card style={{ padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name={cat.icon} size={14} color={col} />
          <Txt variant="subhead" weight="600" color={col}>
            Now
          </Txt>
          <Txt variant="subhead" color={c.label2}>
            · {cat.label}
          </Txt>
          <View style={{ flex: 1 }} />
          <Txt variant="footnote" color={c.label2} tabular>
            {fmtDuration(block.end_min - nowMin)} left
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="title2" numberOfLines={2}>
              {block.title || cat.label}
            </Txt>
            <Txt variant="subhead" color={c.label2} tabular style={{ marginTop: 2 }}>
              {fmtMin(block.start_min)} – {fmtMin(block.end_min)}
            </Txt>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => toggleBlock(block.id)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: block.done ? col : alpha(col, 0.16),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={19} color={block.done ? '#FFFFFF' : col} weight="bold" />
          </Pressable>
        </View>
        <ProgressBar value={progress} color={col} height={5} track={alpha(col, 0.18)} style={{ marginTop: 14 }} />
      </Card>
    </Press>
  );
}

function UpNextRow({ block }: { block: Block }) {
  const { c, accent } = useTheme();
  const col = blockColor(block.category, c, accent);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/block/[id]', params: { id: block.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? c.fill2 : c.card,
      })}
    >
      <Txt variant="subhead" color={c.label2} tabular style={{ width: 44 }}>
        {fmtMin(block.start_min)}
      </Txt>
      <View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: col }} />
      <Txt variant="body" numberOfLines={1} style={{ flex: 1 }}>
        {block.title || BLOCK_CATEGORIES[block.category].label}
      </Txt>
      <Txt variant="subhead" color={c.label2}>
        {fmtDuration(block.end_min - block.start_min)}
      </Txt>
    </Pressable>
  );
}
