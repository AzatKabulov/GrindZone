import { Ionicons } from '@expo/vector-icons';
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

import { alpha, useTheme } from '@/theme';

/** Square check with a punchy pop + ring burst when completed. */
export function Checkbox({
  checked,
  onToggle,
  size = 26,
  color,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  color?: string;
}) {
  const { c, accent, onAccent } = useTheme();
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
    fill.value = withTiming(checked ? 1 : 0, { duration: 160 });
    if (checked) {
      scale.value = withSequence(
        withTiming(0.72, { duration: 80 }),
        withSpring(1, { damping: 7, stiffness: 380 }),
      );
      ring.value = 0;
      ring.value = withTiming(1, { duration: 520 });
    } else {
      scale.value = withSequence(withTiming(0.9, { duration: 70 }), withSpring(1));
    }
  }, [checked, fill, scale, ring]);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: fill.value > 0.5 ? tint : 'transparent',
    borderColor: fill.value > 0.5 ? tint : c.borderStrong,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: interpolate(fill.value, [0, 1], [0.4, 1]) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.1, 1], [0, 0.7, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.8, 2.1]) }],
  }));

  return (
    <Pressable onPress={onToggle} hitSlop={12} style={{ width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size * 0.3, borderWidth: 2, borderColor: alpha(tint, 0.9) },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size * 0.3,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
          },
          boxStyle,
        ]}
      >
        <Animated.View style={checkStyle}>
          <Ionicons name="checkmark-sharp" size={size * 0.7} color={onAccent} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
