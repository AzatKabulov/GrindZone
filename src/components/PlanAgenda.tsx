import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { BLOCK_CATEGORIES, blockColor } from '@/lib/categories';
import { fmtDuration, fmtMin } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { parsePlan, parsePlanLine } from '@/lib/planParse';
import { useTapOrDoubleTap } from '@/lib/useDoubleTap';
import { addPlanBlocks, toggleBlockDone } from '@/store/actions';
import type { Block } from '@/store/data';
import { useFx } from '@/store/fx';
import { alpha, fonts, useTheme } from '@/theme';
import { openBlockMenu } from './blockMenu';
import { Press, ProgressBar, Txt } from './ui';

/**
 * The day as a written plan — one line per block, like a note:
 *   10:30 – 12:30  Wake up, skincare, eat, clean the room          2H
 * Tap to edit, double-tap to cross it off, hold for more. Free time sits between blocks, the current
 * block shows how much is left, and the line at the bottom takes the next block (or a pasted plan).
 */
export function PlanAgenda({
  day,
  list,
  isToday,
  nowMin,
  onNewAt,
}: {
  day: string;
  list: Block[];
  isToday: boolean;
  nowMin: number;
  onNewAt: (start: number) => void;
}) {
  const { c } = useTheme();
  const rows: React.ReactNode[] = [];
  let lastEnd: number | null = null;
  let crossedMidnight = false;
  list.forEach((b) => {
    if (lastEnd !== null && b.start_min - lastEnd >= 15) {
      const from = lastEnd;
      rows.push(<FreeRow key={`free-${b.id}`} minutes={b.start_min - from} onPress={() => onNewAt(from)} />);
    }
    if (!crossedMidnight && b.start_min >= 1440) {
      crossedMidnight = true;
      rows.push(
        <View key="midnight" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <Ionicons name="moon" size={12} color={c.textFaint} />
          <Txt variant="label" color={c.textFaint}>
            AFTER MIDNIGHT
          </Txt>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        </View>,
      );
    }
    rows.push(<AgendaRow key={b.id} block={b} isToday={isToday} nowMin={nowMin} />);
    lastEnd = Math.max(lastEnd ?? 0, b.end_min);
  });

  return (
    <View style={{ gap: 8 }}>
      {rows}
      <PlanLineInput day={day} list={list} />
    </View>
  );
}

function AgendaRow({ block, isToday, nowMin }: { block: Block; isToday: boolean; nowMin: number }) {
  const { c, accent } = useTheme();
  const col = blockColor(block.category, accent);
  const cat = BLOCK_CATEGORIES[block.category];
  const done = block.done;
  const isNow = isToday && !done && block.start_min <= nowMin && nowMin < block.end_min;
  const past = isToday && block.end_min <= nowMin;
  const len = block.end_min - block.start_min;
  const title = block.title || cat.label.charAt(0) + cat.label.slice(1).toLowerCase();
  const strike = done ? ({ textDecorationLine: 'line-through', textDecorationColor: c.textDim } as const) : null;
  const onPress = useTapOrDoubleTap(
    () => router.push({ pathname: '/block/[id]', params: { id: block.id } }),
    () => toggleBlockDone(block.id),
  );

  return (
    <Press
      scaleTo={0.985}
      onPress={onPress}
      onLongPress={() => openBlockMenu(block, accent)}
      delayLongPress={300}
      accessibilityHint="Double-tap to mark done, hold for more"
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: isNow ? alpha(col, 0.1) : c.surface,
        borderWidth: 1,
        borderColor: isNow ? alpha(col, 0.55) : c.border,
        opacity: done ? 0.5 : past ? 0.62 : 1,
      }}
    >
      <View style={{ width: 4, borderRadius: 2, backgroundColor: done ? c.textFaint : col }} />
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* time and title on one line — the text shrinks to fit instead of wrapping */}
          <Text style={{ flex: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.45}>
            <Text style={[{ fontFamily: fonts.monoBold, fontSize: 15, letterSpacing: 0.4, color: done ? c.textDim : c.text }, strike]}>
              {fmtMin(block.start_min)} – {fmtMin(block.end_min)}
            </Text>
            <Text style={[{ fontFamily: fonts.semibold, fontSize: 16, color: done ? c.textDim : c.text }, strike]}>{'  '}{title}</Text>
          </Text>
          {done ? (
            <Ionicons name="checkmark-circle" size={17} color={accent} />
          ) : block.end_min > 1440 ? (
            <Ionicons name="moon" size={11} color={c.textFaint} />
          ) : null}
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, color: c.textDim }}>{fmtDuration(len)}</Text>
        </View>
        {isNow ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, color: col }}>NOW · {fmtDuration(block.end_min - nowMin)} LEFT</Text>
            <ProgressBar value={(nowMin - block.start_min) / Math.max(1, len)} color={col} height={3} track={alpha(col, 0.18)} />
          </View>
        ) : null}
      </View>
    </Press>
  );
}

function FreeRow({ minutes, onPress }: { minutes: number; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} tapHaptic scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2, paddingHorizontal: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: c.textFaint }}>{fmtDuration(minutes)} FREE · TAP TO PLAN</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
    </Press>
  );
}

/** Type a block the way you'd write it: "14:00 - 15:30 Gym". Pasting several lines adds them all. */
function PlanLineInput({ day, list }: { day: string; list: Block[] }) {
  const { c, accent } = useTheme();
  const [text, setText] = useState('');
  const add = () => {
    const line = text.trim();
    if (!line) return;
    if (line.includes('\n')) {
      const { blocks } = parsePlan(line);
      if (!blocks.length) {
        haptic.warning();
        useFx.getState().info('START EACH LINE WITH A TIME', 'Like “10:30 - 12:30 Wake up”.');
        return;
      }
      addPlanBlocks(day, blocks);
      useFx.getState().info('ADDED TO THE PLAN', `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}.`);
      setText('');
      return;
    }
    // Read the time in the context of the day: after the last block if possible, else after the first.
    const last = list[list.length - 1]?.start_min ?? null;
    const first = list[0]?.start_min ?? null;
    const p = (last !== null ? parsePlanLine(line, last) : null) ?? (first !== null ? parsePlanLine(line, first) : null) ?? parsePlanLine(line, null);
    if (!p) {
      haptic.warning();
      useFx.getState().info('START WITH A TIME', 'Like “14:00 - 15:30 Gym” or “2:30 - 3:30 Eat”.');
      return;
    }
    addPlanBlocks(day, [p]);
    useFx.getState().info('ADDED TO THE PLAN', `${fmtMin(p.start)}–${fmtMin(p.end)} ${p.title || BLOCK_CATEGORIES[p.category].label.toLowerCase()}`);
    setText('');
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
        paddingHorizontal: 14,
        minHeight: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: c.borderStrong,
      }}
    >
      <Press onPress={add} hitSlop={10}>
        <Ionicons name="add" size={22} color={accent} />
      </Press>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={add}
        placeholder="14:00 - 15:30 Gym"
        placeholderTextColor={c.textFaint}
        selectionColor={accent}
        returnKeyType="done"
        submitBehavior="submit"
        multiline
        autoCorrect={false}
        style={{ flex: 1, fontFamily: fonts.mono, fontSize: 15, color: c.text, paddingVertical: 14 }}
      />
    </View>
  );
}
