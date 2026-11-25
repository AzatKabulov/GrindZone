import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { progressColor, shade } from '@/lib/productivity';
import { useTheme } from '@/theme';
import { Txt } from './ui';

/**
 * Progress for a screen header: label + "x of y" on one line, a bar underneath that fills up and
 * shifts from red through orange to green as you get closer to 100%.
 */
export function HeaderBar({ label, value, detail }: { label: string; value: number | null; detail?: string }) {
  const { c, isDark } = useTheme();
  const v = value ?? 0;
  const color = progressColor(v, isDark);
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(Math.max(0, Math.min(1, v)), { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [v, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View style={{ gap: 8, marginTop: -4, marginBottom: 20 }} accessibilityLabel={`${label}: ${value === null ? 'nothing yet' : `${Math.round(v * 100)} percent`}`}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Txt variant="label" color={c.text}>
          {label}
        </Txt>
        {detail ? (
          <Txt variant="small" color={c.textDim} style={{ flex: 1, fontSize: 12.5 }} numberOfLines={1}>
            {detail}
          </Txt>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Txt variant="h2" style={{ fontSize: 22 }} color={value === null ? c.textFaint : c.text}>
          {value === null ? '—' : `${Math.round(v * 100)}%`}
        </Txt>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surface3, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 5, overflow: 'hidden' }, fill]}>
          <LinearGradient colors={[shade(color, 0.78), color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </View>
  );
}
