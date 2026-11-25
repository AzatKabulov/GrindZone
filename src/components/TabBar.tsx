import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { alpha, fonts, useTheme } from '@/theme';
import type { IconName } from './ui';

const TABS: Record<string, { label: string; icon: IconName; iconOff: IconName }> = {
  index: { label: 'TODAY', icon: 'flash', iconOff: 'flash-outline' },
  tasks: { label: 'TASKS', icon: 'checkbox', iconOff: 'checkbox-outline' },
  plan: { label: 'PLAN', icon: 'time', iconOff: 'time-outline' },
  goals: { label: 'GOALS', icon: 'trophy', iconOff: 'trophy-outline' },
  notes: { label: 'NOTES', icon: 'reader', iconOff: 'reader-outline' },
};

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { c, accent, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopColor: c.border,
          backgroundColor: Platform.OS === 'ios' ? alpha(c.bg, 0.72) : alpha(c.bg, 0.97),
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptic.tap();
              navigateToTab(route.key);
            }
          };
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={4}>
              <Indicator active={focused} color={accent} />
              <Ionicons
                name={focused ? meta.icon : meta.iconOff}
                size={22}
                color={focused ? accent : c.textFaint}
              />
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 9,
                  letterSpacing: 1.3,
                  color: focused ? c.text : c.textFaint,
                  marginTop: 5,
                }}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Indicator({ active, color }: { active: boolean; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: withSpring(active ? 1 : 0),
    transform: [{ scaleX: withSpring(active ? 1 : 0.2, { damping: 14 }) }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', top: -10, width: 22, height: 3, borderRadius: 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', paddingTop: 2 },
});
