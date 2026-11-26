import { type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { dateKey, monthLong } from '@/lib/date';
import { IconBtn, Txt } from './ui';

const GAP = 6;

/** "2026-11" → the days of that month laid out Monday-first, padded with nulls to whole weeks. */
export function monthCells(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const count = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => dateKey(new Date(y, m - 1, i + 1)))];
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Cell size so 7 columns fit the screen (minus `inset` of horizontal padding). */
export function useCellSize(inset = 40): number {
  const { width } = useWindowDimensions();
  return Math.floor((Math.min(width, 520) - inset - GAP * 6) / 7);
}

/** ‹ NOVEMBER 2026 › */
export function MonthHeader({ month, onShift, canNext = true }: { month: string; onShift: (n: number) => void; canNext?: boolean }) {
  const [y, m] = month.split('-').map(Number);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconBtn icon="chevron-back" size={36} onPress={() => onShift(-1)} />
      <Txt variant="h2" style={{ flex: 1, textAlign: 'center' }}>
        {monthLong(new Date(y, m - 1, 1)).toUpperCase()} {y}
      </Txt>
      <IconBtn icon="chevron-forward" size={36} onPress={() => onShift(1)} disabled={!canNext} />
    </View>
  );
}

/** Weekday letters + the month's days; each day is drawn by `renderDay`. */
export function MonthGrid({ month, size, renderDay }: { month: string; size: number; renderDay: (day: string) => ReactNode }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: GAP, marginBottom: 8 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Txt key={i} variant="label" style={{ width: size, textAlign: 'center', fontSize: 9 }}>
            {d}
          </Txt>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {monthCells(month).map((k, i) => (k ? <View key={k}>{renderDay(k)}</View> : <View key={`pad${i}`} style={{ width: size, height: size }} />))}
      </View>
    </View>
  );
}
