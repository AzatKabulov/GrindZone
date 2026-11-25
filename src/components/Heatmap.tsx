import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { addDays, monthShort, parseKey, startOfWeek, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { alpha, fonts, useTheme } from '@/theme';

/** 0..4 intensity for an activity count. */
function level(n: number, binary: boolean): number {
  if (n <= 0) return 0;
  if (binary) return 4;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 9) return 3;
  return 4;
}

const SHADES = [0, 0.28, 0.5, 0.75, 1];

/**
 * GitHub-style contribution grid: one column per week (Mon → Sun), newest week on the right.
 * `binary` treats any count as "done" (used for habits).
 */
export function Heatmap({
  counts,
  weeks = 17,
  color,
  binary = false,
  legend = true,
  onPressDay,
}: {
  counts: Record<string, number>;
  weeks?: number;
  color?: string;
  binary?: boolean;
  legend?: boolean;
  onPressDay?: (day: string) => void;
}) {
  const { c, accent } = useTheme();
  const tint = color ?? accent;
  const [width, setWidth] = useState(0);
  const gap = 3;
  const cell = width ? Math.floor((width - gap * (weeks - 1)) / weeks) : 0;
  const today = todayKey();

  const columns = useMemo(() => {
    const first = addDays(startOfWeek(today), -(weeks - 1) * 7);
    return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  }, [today, weeks]);

  const empty = c.surface3;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {cell ? (
        <>
          <View style={{ height: 14, marginBottom: 4 }}>
            {columns.map((col, i) => {
              const firstOfMonth = col.find((d) => parseKey(d).getDate() === 1);
              if (!firstOfMonth || i > weeks - 2) return null;
              return (
                <Text
                  key={i}
                  style={{ position: 'absolute', left: i * (cell + gap), fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: c.textFaint }}
                >
                  {monthShort(firstOfMonth)}
                </Text>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap }}>
            {columns.map((col, i) => (
              <View key={i} style={{ gap }}>
                {col.map((d) => {
                  const future = d > today;
                  const lv = level(counts[d] ?? 0, binary);
                  const style = {
                    width: cell,
                    height: cell,
                    borderRadius: Math.max(2, cell * 0.22),
                    backgroundColor: future ? 'transparent' : lv ? alpha(tint, SHADES[lv]) : empty,
                    borderWidth: d === today ? 1.5 : 0,
                    borderColor: c.text,
                  };
                  if (!onPressDay || future) return <View key={d} style={style} />;
                  return (
                    <Pressable
                      key={d}
                      hitSlop={2}
                      onPress={() => {
                        haptic.tap();
                        onPressDay(d);
                      }}
                      style={style}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          {legend ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 8 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: c.textFaint, marginRight: 2 }}>LESS</Text>
              {SHADES.map((s, i) => (
                <View key={i} style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: i ? alpha(tint, s) : empty }} />
              ))}
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: c.textFaint, marginLeft: 2 }}>MORE</Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ height: 120 }} />
      )}
    </View>
  );
}
