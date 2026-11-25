import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/ProgressRing';
import { CountUp, Donut3D, IsoBars, Meter, Reveal, useGrow } from '@/components/wrap/charts';
import { BLOCK_CATEGORIES } from '@/lib/categories';
import { addDays, dayNum, diffDays, fmtDuration, monthShort, startOfWeek, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { progressColor } from '@/lib/productivity';
import { useData } from '@/store/data';
import { useFocus } from '@/store/focus';
import { changePct, scoreTitle, weeklyWrap, type WeekNumbers, type Wrap } from '@/store/wrap';
import { fonts, useTheme } from '@/theme';

/*
 * WEEKLY WRAP — your week as a story: swipe or tap through.
 * Every slide compares with the week before.
 */

const WHITE = '#FFFFFF';
const DIM = 'rgba(255,255,255,0.68)';
const FAINT = 'rgba(255,255,255,0.42)';
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const UP = '#86EFAC';
const DOWN = '#FCA5A5';

type SlideId = 'cover' | 'tasks' | 'days' | 'habits' | 'focus' | 'plan' | 'momentum' | 'score';

const BG: Record<SlideId, [string, string, string]> = {
  cover: ['#FF5A1F', '#6B1A08', '#0A0A0C'],
  tasks: ['#7C3AED', '#2A0E5E', '#0A0A0C'],
  days: ['#0EA5E9', '#0B3B5C', '#0A0A0C'],
  habits: ['#10B981', '#053B2C', '#0A0A0C'],
  focus: ['#F43F5E', '#4C0519', '#0A0A0C'],
  plan: ['#F59E0B', '#5C2B06', '#0A0A0C'],
  momentum: ['#EC4899', '#4A0626', '#0A0A0C'],
  score: ['#84CC16', '#2C4410', '#0A0A0C'],
};

const rangeLabel = (w: WeekNumbers) => `${dayNum(w.start)} ${monthShort(w.start)} – ${dayNum(addDays(w.start, 6))} ${monthShort(addDays(w.start, 6))}`;

export default function WeeklyWrapScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { accent } = useTheme();
  const tasks = useData((s) => s.tasks);
  const habits = useData((s) => s.habits);
  const blocks = useData((s) => s.blocks);
  const goals = useData((s) => s.goals);
  const notes = useData((s) => s.notes);
  const focus = useFocus((s) => s.history);
  const focusMin = useFocus((s) => s.focusMin);
  const today = todayKey();
  const thisMonday = startOfWeek(today);
  // Early in the week, last week's story is the complete one.
  const [offset, setOffset] = useState(() => (diffDays(thisMonday, today) <= 2 ? -1 : 0));
  const weekStart = addDays(thisMonday, offset * 7);

  const wrap = useMemo(
    () => weeklyWrap({ tasks, habits, blocks, goals, notes, focus }, weekStart, today),
    [tasks, habits, blocks, goals, notes, focus, weekStart, today],
  );

  const slides = useMemo(() => {
    const w = wrap.week;
    const p = wrap.prev;
    const list: SlideId[] = ['cover'];
    if (w.tasksTotal || w.tasksDone || p.tasksDone) list.push('tasks', 'days');
    if (w.habits.length) list.push('habits');
    if (w.focusSessions || p.focusSessions) list.push('focus');
    if (w.plannedMin) list.push('plan');
    list.push('momentum', 'score');
    return list;
  }, [wrap]);

  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const go = (i: number) => {
    if (i < 0 || i >= slides.length) return;
    haptic.tap();
    setIndex(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const pickWeek = (o: number) => {
    haptic.tap();
    setOffset(o);
    setIndex(0);
    scroller.current?.scrollTo({ x: 0, animated: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0C' }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== index) {
            haptic.tap();
            setIndex(i);
          }
        }}
        scrollEventThrottle={16}
      >
        {slides.map((id, i) => (
          <View key={`${weekStart}-${id}`} style={{ width, height }}>
            <LinearGradient colors={BG[id]} locations={[0, 0.55, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            {/* tap left = back, tap right = next */}
            <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
              <Pressable style={{ flex: 3 }} onPress={() => go(i - 1)} accessibilityLabel="Previous" />
              <Pressable style={{ flex: 7 }} onPress={() => go(i + 1)} accessibilityLabel="Next" />
            </View>
            <View pointerEvents="box-none" style={{ flex: 1, paddingTop: insets.top + 84, paddingBottom: insets.bottom + 28, paddingHorizontal: 24 }}>
              <SlideBody id={id} wrap={wrap} active={i === index} width={width - 48} focusMin={focusMin} accent={accent} offset={offset} onPickWeek={pickWeek} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* story progress + close */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {slides.map((s, i) => (
            <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= index ? WHITE : 'rgba(255,255,255,0.28)' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <Text style={{ flex: 1, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, color: DIM }}>
            WEEKLY WRAP · {rangeLabel(wrap.week).toUpperCase()}
          </Text>
          <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color={WHITE} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SlideBody(props: {
  id: SlideId;
  wrap: Wrap;
  active: boolean;
  width: number;
  focusMin: number;
  accent: string;
  offset: number;
  onPickWeek: (o: number) => void;
}) {
  switch (props.id) {
    case 'cover':
      return <Cover {...props} />;
    case 'tasks':
      return <TasksSlide {...props} />;
    case 'days':
      return <DaysSlide {...props} />;
    case 'habits':
      return <HabitsSlide {...props} />;
    case 'focus':
      return <FocusSlide {...props} />;
    case 'plan':
      return <PlanSlide {...props} />;
    case 'momentum':
      return <MomentumSlide {...props} />;
    default:
      return <ScoreSlide {...props} />;
  }
}

/* ───────────────────────────── building blocks ───────────────────────────── */

function Kicker({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 2.4, color: DIM }}>{children}</Text>;
}

function Big({ children, size = 64 }: { children: ReactNode; size?: number }) {
  return <Text style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 0.98, color: WHITE, letterSpacing: 0.5 }}>{children}</Text>;
}

function Body({ children, color = DIM }: { children: ReactNode; color?: string }) {
  return <Text style={{ fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color }}>{children}</Text>;
}

/** "+28% vs last week" with an arrow (text stays white; the arrow carries direction). */
function Change({ now, before, vs, unit = '', pts = false }: { now: number | null; before: number | null; vs: string; unit?: string; pts?: boolean }) {
  if (now === null || before === null) return <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: FAINT }}>Nothing to compare with {vs}</Text>;
  const diff = pts ? Math.round((now - before) * 100) : changePct(now, before);
  if (diff === null) return <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: FAINT }}>Nothing to compare with {vs}</Text>;
  const up = diff > 0;
  const same = diff === 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.28)' }}>
      <Ionicons name={same ? 'remove' : up ? 'trending-up' : 'trending-down'} size={16} color={same ? DIM : up ? UP : DOWN} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: WHITE }}>
        {same ? `Level with ${vs}` : `${up ? '+' : ''}${diff}${pts ? ' pts' : '%'}${unit} vs ${vs}`}
      </Text>
    </View>
  );
}

/* ───────────────────────────── slides ───────────────────────────── */

function Cover({ wrap, active, width, offset, onPickWeek }: { wrap: Wrap; active: boolean; width: number; offset: number; onPickWeek: (o: number) => void }) {
  const p = useGrow(active, 1400, 250);
  const w = wrap.week;
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }} pointerEvents="box-none">
      <View pointerEvents="box-none" style={{ gap: 14 }}>
        <Reveal active={active}>
          <Kicker>{wrap.isCurrent ? 'THIS WEEK, SO FAR' : 'YOUR WEEK'}</Kicker>
        </Reveal>
        <Reveal active={active} delay={120}>
          <Big size={92}>YOUR WEEK.{'\n'}WRAPPED.</Big>
        </Reveal>
        <Reveal active={active} delay={260}>
          <Body color={WHITE}>{rangeLabel(w)}</Body>
        </Reveal>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          {[
            { o: -1, label: 'LAST WEEK' },
            { o: 0, label: 'THIS WEEK' },
          ].map((c) => (
            <Pressable
              key={c.o}
              onPress={() => onPickWeek(c.o)}
              style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: offset === c.o ? WHITE : 'rgba(0,0,0,0.28)' }}
            >
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6, color: offset === c.o ? '#0A0A0C' : WHITE }}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View pointerEvents="none">
        <IsoBars values={w.perDay} labels={DAYS} color="#FFD3BD" width={width} height={150} progress={p} />
        <Text style={{ marginTop: 18, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, color: DIM, textAlign: 'center' }}>TAP TO START  →</Text>
      </View>
    </View>
  );
}

function TasksSlide({ wrap, active }: { wrap: Wrap; active: boolean }) {
  const w = wrap.week;
  const pv = wrap.prev;
  const p = useGrow(active, 1100, 500);
  const pct = w.completion ?? 0;
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 22 }} pointerEvents="box-none">
      <Reveal active={active}>
        <Kicker>TASKS</Kicker>
      </Reveal>
      <Reveal active={active} delay={100}>
        <Body color={WHITE}>You closed</Body>
        <CountUp to={w.tasksDone} active={active} style={{ fontFamily: fonts.display, fontSize: 150, lineHeight: 150, color: WHITE }} />
        <Big size={40}>{w.tasksDone === 1 ? 'TASK' : 'TASKS'}</Big>
      </Reveal>
      <Reveal active={active} delay={300}>
        <Change now={w.tasksDone} before={pv.tasksDone} vs={wrap.prevLabel} />
      </Reveal>
      {w.completion !== null ? (
        <Reveal active={active} delay={450} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ flex: 1, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, color: DIM }}>COMPLETION RATE</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, color: WHITE }}>{Math.round(pct * 100)}%</Text>
          </View>
          <View style={{ height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100 * p}%`, height: '100%', borderRadius: 7, backgroundColor: progressColor(pct) }} />
          </View>
          <Body>
            {w.tasksDone} of {w.tasksTotal} planned tasks done
            {pv.completion !== null ? ` · ${Math.round(pv.completion * 100)}% ${wrap.prevLabel}` : ''}
          </Body>
        </Reveal>
      ) : null}
    </View>
  );
}

function DaysSlide({ wrap, active, width }: { wrap: Wrap; active: boolean; width: number }) {
  const w = wrap.week;
  const p = useGrow(active, 1300, 300);
  const best = w.bestDay;
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 22 }} pointerEvents="box-none">
      <Reveal active={active}>
        <Kicker>DAY BY DAY</Kicker>
      </Reveal>
      <Reveal active={active} delay={100}>
        {best ? (
          <>
            <Big size={56}>{DAY_NAMES[best.index]}</Big>
            <Big size={56}>WAS YOUR DAY.</Big>
            <View style={{ height: 8 }} />
            <Body>
              {best.count} {best.count === 1 ? 'task' : 'tasks'} done — your best day this week.
            </Body>
          </>
        ) : (
          <Big size={52}>A QUIET WEEK.</Big>
        )}
      </Reveal>
      <Reveal active={active} delay={250} style={{ gap: 12 }}>
        <IsoBars values={w.perDay} ghost={wrap.prev.perDay} labels={DAYS} color="#7DD3FC" width={width} height={200} progress={p} highlight={best?.index} />
        <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
          <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#7DD3FC' }} />} label="This week" />
          <Legend
            swatch={<View style={{ width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' }} />}
            label={wrap.isCurrent ? 'Same days last week' : 'Week before'}
          />
        </View>
      </Reveal>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {swatch}
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: DIM }}>{label}</Text>
    </View>
  );
}

function HabitsSlide({ wrap, active }: { wrap: Wrap; active: boolean }) {
  const w = wrap.week;
  const p = useGrow(active, 1100, 450);
  const sorted = [...w.habits].filter((h) => h.possible > 0).sort((a, b) => b.done / b.possible - a.done / a.possible);
  const top = sorted[0];
  const rate = w.habitRate ?? 0;
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 20 }} pointerEvents="box-none">
      <Reveal active={active}>
        <Kicker>HABITS</Kicker>
      </Reveal>
      <Reveal active={active} delay={100}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <CountUp to={rate * 100} active={active} format={(n) => `${Math.round(n)}`} style={{ fontFamily: fonts.display, fontSize: 130, lineHeight: 130, color: WHITE }} />
          <Big size={56}>%</Big>
        </View>
        <Big size={36}>CONSISTENCY</Big>
      </Reveal>
      <Reveal active={active} delay={250}>
        <Change now={w.habitRate} before={wrap.prev.habitRate} vs={wrap.prevLabel} pts />
      </Reveal>
      <Reveal active={active} delay={380} style={{ gap: 14 }}>
        {w.habits.slice(0, 5).map((h) => (
          <View key={h.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>{h.emoji || '•'}</Text>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: WHITE }} numberOfLines={1}>
                {h.title}
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: DIM }}>
                {h.done}/{h.possible}
              </Text>
            </View>
            <Meter value={h.possible ? h.done / h.possible : 0} color="#6EE7B7" progress={p} />
          </View>
        ))}
        {top && top.possible ? (
          <Body>
            Most consistent: <Text style={{ color: WHITE, fontFamily: fonts.semibold }}>{top.title}</Text> ({top.done}/{top.possible}).
          </Body>
        ) : null}
      </Reveal>
    </View>
  );
}

function FocusSlide({ wrap, active, width, focusMin }: { wrap: Wrap; active: boolean; width: number; focusMin: number }) {
  const w = wrap.week;
  const p = useGrow(active, 1200, 350);
  const minutes = w.focusSessions * focusMin;
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 22 }} pointerEvents="box-none">
      <Reveal active={active}>
        <Kicker>DEEP WORK</Kicker>
      </Reveal>
      <Reveal active={active} delay={100}>
        <CountUp to={w.focusSessions} active={active} style={{ fontFamily: fonts.display, fontSize: 150, lineHeight: 150, color: WHITE }} />
        <Big size={40}>FOCUS {w.focusSessions === 1 ? 'SESSION' : 'SESSIONS'}</Big>
        <View style={{ height: 8 }} />
        <Body>≈ {fmtDuration(minutes).toLowerCase()} of locked-in time.</Body>
      </Reveal>
      <Reveal active={active} delay={250}>
        <Change now={w.focusSessions} before={wrap.prev.focusSessions} vs={wrap.prevLabel} />
      </Reveal>
      <Reveal active={active} delay={380}>
        <IsoBars values={w.focusPerDay} ghost={wrap.prev.focusPerDay} labels={DAYS} color="#FDA4AF" width={width} height={150} progress={p} />
      </Reveal>
    </View>
  );
}

function PlanSlide({ wrap, active, width, accent }: { wrap: Wrap; active: boolean; width: number; accent: string }) {
  const w = wrap.week;
  const p = useGrow(active, 1300, 350);
  const slices = w.plannedByCat.map((s) => ({ ...s, value: s.min, color: BLOCK_CATEGORIES[s.cat]?.color ?? accent, label: BLOCK_CATEGORIES[s.cat]?.label ?? s.cat }));
  const size = Math.min(width, 300);
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 20 }} pointerEvents="box-none">
      <Reveal active={active}>
        <Kicker>YOUR TIME</Kicker>
      </Reveal>
      <Reveal active={active} delay={100}>
        <Big size={88}>{fmtDuration(w.plannedMin)}</Big>
        <Big size={36}>PLANNED IN BLOCKS</Big>
      </Reveal>
      <Reveal active={active} delay={220}>
        <Change now={w.plannedMin} before={wrap.prev.plannedMin} vs={wrap.prevLabel} />
      </Reveal>
      <Reveal active={active} delay={320} style={{ alignItems: 'center', gap: 16 }}>
        <Donut3D slices={slices} size={size} progress={p} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
          {slices.map((s) => (
            <Legend
              key={s.cat}
              swatch={<View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: s.color }} />}
              label={`${s.label.charAt(0)}${s.label.slice(1).toLowerCase()} ${fmtDuration(s.min).toLowerCase()}`}
            />
          ))}
        </View>
      </Reveal>
    </View>
  );
}

function MomentumSlide({ wrap, active }: { wrap: Wrap; active: boolean }) {
  const w = wrap.week;
  const totalTod = w.timeOfDay.reduce((a, b) => a + b, 0);
  const peak = totalTod ? w.timeOfDay.indexOf(Math.max(...w.timeOfDay)) : -1;
  const persona: { name: string; when: string } | undefined = [
    { name: 'MORNING GRINDER', when: 'before noon' },
    { name: 'AFTERNOON CLOSER', when: 'between 12 and 5 pm' },
    { name: 'EVENING FINISHER', when: 'between 5 and 10 pm' },
    { name: 'NIGHT OWL', when: 'after 10 pm' },
  ][peak];
  const n = w.days.length;

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 22 }} pointerEvents="box-none">
      <Reveal active={active}>
        <Kicker>MOMENTUM</Kicker>
      </Reveal>
      {persona ? (
        <Reveal active={active} delay={100} style={{ gap: 8 }}>
          <Body color={WHITE}>You&apos;re a</Body>
          <Big size={62}>{persona.name}</Big>
          <Body>
            {Math.round((w.timeOfDay[peak] / totalTod) * 100)}% of your tasks got done {persona.when}.
          </Body>
        </Reveal>
      ) : null}
      <Reveal active={active} delay={260} style={{ flexDirection: 'row', gap: 10 }}>
        <Tile icon="flame" value={`${wrap.streak}`} label="DAY STREAK" />
        <Tile icon="calendar" value={`${w.activeDays}/${n}`} label="ACTIVE DAYS" />
      </Reveal>
      <Reveal active={active} delay={360} style={{ flexDirection: 'row', gap: 10 }}>
        <Tile icon="footsteps" value={`${w.stepsDone}`} label="GOAL STEPS" />
        <Tile icon="trophy" value={`${w.goalsAchieved.length}`} label={w.goalsAchieved.length === 1 ? 'GOAL ACHIEVED' : 'GOALS ACHIEVED'} />
      </Reveal>
      {w.goalsAchieved.length ? (
        <Reveal active={active} delay={460}>
          <Body>
            🏆 <Text style={{ color: WHITE, fontFamily: fonts.semibold }}>{w.goalsAchieved.join(', ')}</Text>
          </Body>
        </Reveal>
      ) : null}
    </View>
  );
}

function Tile({ icon, value, label }: { icon: 'flame' | 'calendar' | 'footsteps' | 'trophy'; value: string; label: string }) {
  return (
    <View style={{ flex: 1, padding: 16, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
      <Ionicons name={icon} size={18} color={WHITE} />
      <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 42, color: WHITE }}>{value}</Text>
      <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, color: DIM }}>{label}</Text>
    </View>
  );
}

function ScoreSlide({ wrap, active, focusMin }: { wrap: Wrap; active: boolean; focusMin: number }) {
  const w = wrap.week;
  const pv = wrap.prev;
  const { title, line } = scoreTitle(w.score);
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
  const rows: { label: string; now: string; before: string; diff: number | null }[] = [
    { label: 'Tasks done', now: String(w.tasksDone), before: String(pv.tasksDone), diff: w.tasksDone - pv.tasksDone },
    {
      label: 'Completion',
      now: pct(w.completion),
      before: pct(pv.completion),
      diff: w.completion !== null && pv.completion !== null ? Math.round((w.completion - pv.completion) * 100) : null,
    },
    {
      label: 'Habits',
      now: pct(w.habitRate),
      before: pct(pv.habitRate),
      diff: w.habitRate !== null && pv.habitRate !== null ? Math.round((w.habitRate - pv.habitRate) * 100) : null,
    },
    { label: 'Focus', now: fmtDuration(w.focusSessions * focusMin).toLowerCase(), before: fmtDuration(pv.focusSessions * focusMin).toLowerCase(), diff: w.focusSessions - pv.focusSessions },
    { label: 'Planned', now: fmtDuration(w.plannedMin).toLowerCase(), before: fmtDuration(pv.plannedMin).toLowerCase(), diff: w.plannedMin - pv.plannedMin },
    { label: 'Active days', now: String(w.activeDays), before: String(pv.activeDays), diff: w.activeDays - pv.activeDays },
    { label: 'Goal steps', now: String(w.stepsDone), before: String(pv.stepsDone), diff: w.stepsDone - pv.stepsDone },
  ];
  const ringColor = progressColor(w.score / 100);

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 18 }} pointerEvents="box-none">
      <Reveal active={active}>
        <Kicker>WEEKLY SCORE</Kicker>
      </Reveal>
      <Reveal active={active} delay={80} style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <ProgressRing value={active ? w.score / 100 : 0} size={124} stroke={11} color={ringColor}>
          <CountUp to={w.score} active={active} style={{ fontFamily: fonts.display, fontSize: 54, color: WHITE, marginTop: 4 }} />
        </ProgressRing>
        <View style={{ flex: 1, gap: 6 }}>
          <Big size={40}>{title}</Big>
          <Body>{line}</Body>
        </View>
      </Reveal>
      <Reveal active={active} delay={200}>
        <Change now={w.score / 100} before={pv.score / 100} vs={wrap.prevLabel} pts />
      </Reveal>
      <Reveal active={active} delay={320} style={{ borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.32)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
          <Text style={[th, { flex: 1, textAlign: 'left' }]} numberOfLines={1}>
            {wrap.isCurrent && wrap.week.days.length < 7 ? 'VS SAME DAYS' : 'VS WEEK BEFORE'}
          </Text>
          <Text style={th}>THIS</Text>
          <Text style={th}>BEFORE</Text>
          <View style={{ width: 28 }} />
        </View>
        {rows.map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: DIM }}>{r.label}</Text>
            <Text style={[td, { color: WHITE, fontFamily: fonts.semibold }]}>{r.now}</Text>
            <Text style={td}>{r.before}</Text>
            <View style={{ width: 28, alignItems: 'flex-end' }}>
              {r.diff === null || r.diff === 0 ? (
                <Ionicons name="remove" size={16} color={FAINT} />
              ) : (
                <Ionicons name={r.diff > 0 ? 'arrow-up' : 'arrow-down'} size={16} color={r.diff > 0 ? UP : DOWN} />
              )}
            </View>
          </View>
        ))}
      </Reveal>
      <Reveal active={active} delay={440}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.8, color: DIM, textAlign: 'center' }}>SCREENSHOT IT. THEN BEAT IT NEXT WEEK.</Text>
      </Reveal>
    </View>
  );
}

const th = { width: 64, textAlign: 'right' as const, fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: FAINT };
const td = { width: 64, textAlign: 'right' as const, fontFamily: fonts.medium, fontSize: 14, color: DIM };
