import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PulseDot } from '@/components/bits';
import { FxHost } from '@/components/FxHost';
import { FieldLabel, SheetHeader } from '@/components/pickers';
import { ProgressRing } from '@/components/ProgressRing';
import { Button, Card, Chip, Txt } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { toggleTask } from '@/store/actions';
import { useData } from '@/store/data';
import { remainingOf, useFocus } from '@/store/focus';
import { alpha, useTheme } from '@/theme';

const FOCUS_OPTIONS = [15, 25, 45, 60];
const BREAK_OPTIONS = [5, 10, 15];
const REST = '#4DB38A';

function clock(ms: number) {
  const sec = Math.ceil(ms / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

/** Pomodoro: focus for a set time, take a short break, repeat. */
export default function FocusScreen() {
  useKeepAwake();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const st = useFocus();
  const task = useData((s) => (st.taskId ? s.tasks[st.taskId] : undefined));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const isBreak = st.phase === 'break';
  const col = isBreak ? REST : accent;
  const total = (isBreak ? st.breakMin : st.focusMin) * 60_000;
  const remaining = remainingOf(st, now);
  const fresh = !st.running && st.remainingMs >= total;
  const sessionsToday = st.history[todayKey()] ?? 0;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const mainLabel = st.running ? 'PAUSE' : fresh ? (isBreak ? 'START BREAK' : 'START FOCUS') : 'RESUME';

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader kicker="POMODORO" title="FOCUS" onClose={close} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: insets.bottom + 40, gap: 22 }}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {st.running ? <PulseDot color={col} /> : null}
            <Txt variant="label" color={col}>
              {isBreak ? 'BREAK — BREATHE' : `FOCUS · ROUND ${st.round + 1}`}
              {!st.running && !fresh ? ' · PAUSED' : ''}
            </Txt>
          </View>
          <ProgressRing value={1 - remaining / total} size={264} stroke={12} color={col}>
            <Txt variant="hero" style={{ fontSize: 76, lineHeight: 76, marginTop: 8 }}>
              {clock(remaining)}
            </Txt>
            <Txt variant="label">{isBreak ? `${st.breakMin} MIN BREAK` : `${st.focusMin} MIN FOCUS`}</Txt>
          </ProgressRing>
        </View>

        {task && !task.deleted ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: alpha(col, 0.35) }}>
            {task.emoji ? <Text style={{ fontSize: 22 }}>{task.emoji}</Text> : <Ionicons name="locate-outline" size={18} color={col} />}
            <View style={{ flex: 1 }}>
              <Txt variant="label">WORKING ON</Txt>
              <Txt variant="title" numberOfLines={2} style={{ marginTop: 2, textDecorationLine: task.done ? 'line-through' : 'none' }}>
                {task.title}
              </Txt>
            </View>
            {!task.done ? (
              <Pressable hitSlop={8} onPress={() => toggleTask(task.id)}>
                <Txt variant="label" color={col}>
                  DONE
                </Txt>
              </Pressable>
            ) : null}
            <Pressable hitSlop={8} onPress={() => st.setTask(null)}>
              <Ionicons name="close" size={18} color={c.textFaint} />
            </Pressable>
          </Card>
        ) : null}

        <View style={{ gap: 10 }}>
          <Button label={mainLabel} icon={st.running ? 'pause' : 'play'} color={col} onPress={() => (st.running ? st.pause() : st.start())} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="RESET" icon="refresh" variant="outline" small style={{ flex: 1 }} onPress={st.reset} />
            <Button label={isBreak ? 'SKIP BREAK' : 'SKIP TO BREAK'} icon="play-skip-forward" variant="outline" small style={{ flex: 1 }} onPress={st.skip} />
          </View>
        </View>

        {!st.running ? (
          <View style={{ gap: 16 }}>
            <View>
              <FieldLabel>FOCUS LENGTH</FieldLabel>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FOCUS_OPTIONS.map((m) => (
                  <Chip key={m} label={`${m} MIN`} active={st.focusMin === m} onPress={() => st.setLengths({ focusMin: m })} style={{ flex: 1, justifyContent: 'center' }} />
                ))}
              </View>
            </View>
            <View>
              <FieldLabel>BREAK LENGTH</FieldLabel>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {BREAK_OPTIONS.map((m) => (
                  <Chip key={m} label={`${m} MIN`} color={REST} active={st.breakMin === m} onPress={() => st.setLengths({ breakMin: m })} style={{ flex: 1, justifyContent: 'center' }} />
                ))}
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: Math.max(4, sessionsToday) }, (_, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < sessionsToday ? accent : c.surface3 }} />
            ))}
          </View>
          <Txt variant="small" color={c.textDim}>
            {sessionsToday ? `${sessionsToday} focus ${sessionsToday === 1 ? 'session' : 'sessions'} today` : 'No focus sessions yet today'}
          </Txt>
          <Txt variant="small" color={c.textFaint} style={{ textAlign: 'center' }}>
            The timer keeps running if you leave this screen or lock your phone.
          </Txt>
        </View>
      </ScrollView>
      <FxHost />
    </View>
  );
}
