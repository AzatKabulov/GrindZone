import { useEffect, useId, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { alpha, shade, useTheme } from '@/theme';

const ACircle = Animated.createAnimatedComponent(Circle);

export interface RingSpec {
  value: number;
  /** [start, end] gradient colours. */
  colors: [string, string];
}

/** Concentric activity-style rings with gradient strokes and round caps. */
export function Rings({
  rings,
  size = 132,
  stroke = 16,
  gap = 3,
  children,
}: {
  rings: RingSpec[];
  size?: number;
  stroke?: number;
  gap?: number;
  children?: ReactNode;
}) {
  // Gradient ids must be unique per instance (they're global in the web DOM).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          {rings.map((r, i) => (
            <LinearGradient key={i} id={`ring${uid}x${i}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={r.colors[0]} />
              <Stop offset="1" stopColor={r.colors[1]} />
            </LinearGradient>
          ))}
        </Defs>
        {rings.map((r, i) => (
          <Ring key={i} index={i} gradientId={`ring${uid}x${i}`} spec={r} size={size} stroke={stroke} radius={(size - stroke) / 2 - i * (stroke + gap)} />
        ))}
      </Svg>
      {children}
    </View>
  );
}

function Ring({
  spec,
  index,
  gradientId,
  size,
  stroke,
  radius,
}: {
  spec: RingSpec;
  index: number;
  gradientId: string;
  size: number;
  stroke: number;
  radius: number;
}) {
  const { isDark } = useTheme();
  const circ = 2 * Math.PI * radius;
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withDelay(
        120 * index,
        withTiming(Math.max(0, Math.min(1, spec.value)), { duration: 1100, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [spec.value, index, p]);
  const props = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - Math.max(0.0001, p.value)),
  }));
  return (
    <>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={alpha(spec.colors[1], isDark ? 0.22 : 0.16)}
        strokeWidth={stroke}
        fill="none"
      />
      <ACircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circ} ${circ}`}
        animatedProps={props}
      />
    </>
  );
}

/** Single thin ring for compact progress (goal cards). */
export function MiniRing({
  value,
  size = 44,
  stroke = 5,
  color,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
}) {
  return (
    <Rings rings={[{ value, colors: [shade(color, 0.25), color] }]} size={size} stroke={stroke}>
      {children}
    </Rings>
  );
}
