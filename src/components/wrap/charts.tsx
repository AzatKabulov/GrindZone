import { useEffect, useState, type ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { G, Path, Polygon, Rect } from 'react-native-svg';

import { shade } from '@/lib/productivity';
import { fonts } from '@/theme';

/** 0 → 1 over `duration` ms each time `active` turns true (back to 0 when it turns false). */
export function useGrow(active: boolean, duration = 1100, delay = 150): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!active) {
      const id = requestAnimationFrame(() => setP(0));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const t0 = Date.now() + delay;
    const tick = () => {
      const t = Math.max(0, Math.min(1, (Date.now() - t0) / duration));
      setP(1 - Math.pow(1 - t, 3)); // ease-out cubic
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, duration, delay]);
  return p;
}

/** A number that counts up when its slide opens. */
export function CountUp({
  to,
  active,
  format = (n) => String(Math.round(n)),
  style,
  delay = 200,
}: {
  to: number;
  active: boolean;
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  delay?: number;
}) {
  const p = useGrow(active, 1200, delay);
  return <Text style={style}>{format(to * p)}</Text>;
}

/** Fades and slides its children in each time the slide opens. Not touchable unless `interactive`, so taps reach the story's tap zones. */
export function Reveal({
  active,
  delay = 0,
  children,
  style,
  interactive = false,
}: {
  active: boolean;
  delay?: number;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  interactive?: boolean;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(active ? withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })) : 0);
  }, [active, delay, v]);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 18 }] }));
  return (
    <Animated.View pointerEvents={interactive ? 'box-none' : 'none'} style={[style, a]}>
      {children}
    </Animated.View>
  );
}

/**
 * 3D (isometric) column chart: one prism per value, with an optional "ghost" outline per column
 * (e.g. last week) for comparison. Single series + optional ghost, so a two-item legend sits beside it.
 */
export function IsoBars({
  values,
  ghost,
  labels,
  color,
  width,
  height = 190,
  progress,
  highlight,
}: {
  values: number[];
  ghost?: number[];
  labels: string[];
  color: string;
  width: number;
  height?: number;
  progress: number;
  /** Index whose value is labelled on top (e.g. the best day). */
  highlight?: number;
}) {
  const n = values.length;
  const max = Math.max(1, ...values, ...(ghost ?? []));
  const slot = width / n;
  const bw = Math.min(30, slot * 0.5);
  const dx = bw * 0.5;
  const dy = bw * 0.32;
  const y0 = height - 4;
  const room = height - dy - 30;
  const front = color;
  const side = shade(color, 0.6);
  const top = shade(color, 1.28);

  const bars = values.map((v, i) => {
    const x = i * slot + (slot - bw - dx) / 2 + (ghost ? bw * 0.22 : 0);
    const h = Math.max(v > 0 ? 3 : 0, (v / max) * room * progress);
    const g = ghost ? (ghost[i] / max) * room : 0;
    return { x, h, g, v };
  });

  return (
    <View>
      <Svg width={width} height={height}>
        {/* floor */}
        <Polygon points={`0,${y0} ${dx},${y0 - dy} ${width},${y0 - dy} ${width - dx},${y0}`} fill="rgba(255,255,255,0.07)" />
        {bars.map((b, i) => (
          <G key={i}>
            {ghost && b.g > 0 ? (
              // the comparison column sits half a bar to the left and behind, so it's visible even when shorter
              <G opacity={0.6} x={-bw * 0.5}>
                <Polygon
                  points={`${b.x},${y0 - b.g} ${b.x + dx},${y0 - b.g - dy} ${b.x + bw + dx},${y0 - b.g - dy} ${b.x + bw},${y0 - b.g} ${b.x + bw},${y0} ${b.x},${y0}`}
                  fill="rgba(255,255,255,0.06)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={1}
                />
              </G>
            ) : null}
            {b.h > 0 ? (
              <G>
                <Polygon points={`${b.x + bw},${y0 - b.h} ${b.x + bw + dx},${y0 - b.h - dy} ${b.x + bw + dx},${y0 - dy} ${b.x + bw},${y0}`} fill={side} />
                <Rect x={b.x} y={y0 - b.h} width={bw} height={b.h} fill={front} />
                <Polygon points={`${b.x},${y0 - b.h} ${b.x + dx},${y0 - b.h - dy} ${b.x + bw + dx},${y0 - b.h - dy} ${b.x + bw},${y0 - b.h}`} fill={top} />
              </G>
            ) : null}
          </G>
        ))}
      </Svg>
      {/* value on the highlighted column */}
      {highlight !== undefined && highlight >= 0 && bars[highlight] && progress > 0.85 ? (
        <Text
          style={{
            position: 'absolute',
            left: bars[highlight].x - 10,
            width: bw + dx + 20,
            top: y0 - bars[highlight].h - dy - 22,
            textAlign: 'center',
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: '#FFFFFF',
          }}
        >
          {values[highlight]}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {labels.map((l, i) => (
          <Text
            key={i}
            style={{ width: slot, textAlign: 'center', fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, color: i === highlight ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** A tilted 3D donut: each slice has a top face and a visible side wall at the front. */
export function Donut3D({
  slices,
  size,
  progress,
}: {
  slices: { value: number; color: string }[];
  size: number;
  progress: number;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const cx = size / 2;
  const R = size * 0.46;
  const Ry = R * 0.52;
  const r = R * 0.56;
  const ry = Ry * 0.56;
  const depth = size * 0.11;
  const cy = Ry + 6;
  const H = cy + Ry + depth + 6;
  const start = -Math.PI / 2;
  const sweepAll = Math.PI * 2 * Math.min(1, progress);

  const pt = (rx: number, rr: number, t: number, dyy = 0) => `${(cx + rx * Math.cos(t)).toFixed(2)},${(cy + rr * Math.sin(t) + dyy).toFixed(2)}`;
  const arc = (rx: number, rr: number, a: number, b: number, sweep: 0 | 1, dyy = 0) =>
    `A ${rx} ${rr} 0 ${Math.abs(b - a) > Math.PI ? 1 : 0} ${sweep} ${pt(rx, rr, sweep ? b : a, dyy)}`;

  // Clip [a, b] to [lo, hi]
  const clip = (a: number, b: number, lo: number, hi: number): [number, number] | null => {
    const s = Math.max(a, lo);
    const e = Math.min(b, hi);
    return e - s > 0.001 ? [s, e] : null;
  };
  const wall = (rx: number, rr: number, a: number, b: number) =>
    `M ${pt(rx, rr, a)} ${arc(rx, rr, a, b, 1)} L ${pt(rx, rr, b, depth)} ${arc(rx, rr, a, b, 0, depth)} Z`;

  // Slice angles: running sums computed up front (no reassignment while mapping).
  const shown = slices.filter((s) => s.value > 0);
  const starts = shown.map((_, i) => start + (shown.slice(0, i).reduce((a, s) => a + s.value, 0) / total) * Math.PI * 2);
  const parts = shown
    .map((s, i) => {
      const a = starts[i];
      const b = Math.min(start + sweepAll, a + (s.value / total) * Math.PI * 2 - 0.004);
      return { ...s, a, b };
    })
    .filter((p) => p.b > p.a);

  const inner: string[] = [];
  const outer: string[] = [];
  const tops: string[] = [];
  for (const p of parts) {
    // Inside of the far wall shows through the hole (back half: -90°…0° and 180°…270°)
    for (const [lo, hi] of [
      [-Math.PI / 2, 0],
      [Math.PI, (3 * Math.PI) / 2],
    ]) {
      const c = clip(p.a, p.b, lo, hi);
      if (c) inner.push(`${wall(r, ry, c[0], c[1])}|${shade(p.color, 0.42)}`);
    }
    const f = clip(p.a, p.b, 0, Math.PI);
    if (f) outer.push(`${wall(R, Ry, f[0], f[1])}|${shade(p.color, 0.62)}`);
    tops.push(
      `M ${pt(R, Ry, p.a)} ${arc(R, Ry, p.a, p.b, 1)} L ${pt(r, ry, p.b)} ${arc(r, ry, p.a, p.b, 0)} Z|${p.color}`,
    );
  }

  return (
    <Svg width={size} height={H}>
      {[...inner, ...outer, ...tops].map((s, i) => {
        const [d, fill] = s.split('|');
        return <Path key={i} d={d} fill={fill} />;
      })}
    </Svg>
  );
}

/** A thin horizontal meter (used for per-habit rows). */
export function Meter({ value, color, progress }: { value: number; color: string; progress: number }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100 * progress}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}
