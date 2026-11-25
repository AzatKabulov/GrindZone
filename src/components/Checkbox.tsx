import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { Icon } from './Icon';

/** Round check like Apple Reminders: hollow ring → filled circle with a springy checkmark. */
export function Checkbox({
  checked,
  onToggle,
  size = 24,
  color,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  color?: string;
}) {
  const { c, accent } = useTheme();
  const tint = color ?? accent;
  const fill = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    fill.set(withTiming(checked ? 1 : 0, { duration: 180 }));
    if (checked) {
      scale.set(withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 340 })));
      ring.set(0);
      ring.set(withTiming(1, { duration: 480 }));
    } else {
      scale.set(withSequence(withTiming(0.9, { duration: 70 }), withSpring(1)));
    }
  }, [checked, fill, scale, ring]);

  const outer = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dot = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: interpolate(fill.value, [0, 1], [0.3, 1]) }],
  }));
  const burst = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.15, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.9]) }],
  }));

  return (
    <Pressable onPress={onToggle} hitSlop={14} style={{ width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: tint }, burst]}
      />
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.6,
            borderColor: checked ? tint : c.label3,
            alignItems: 'center',
            justifyContent: 'center',
          },
          outer,
        ]}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size - 5,
              height: size - 5,
              borderRadius: size / 2,
              backgroundColor: tint,
              alignItems: 'center',
              justifyContent: 'center',
            },
            dot,
          ]}
        >
          <Icon name="check" size={size * 0.5} color="#FFFFFF" weight="bold" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
