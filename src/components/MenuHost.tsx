import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMenu, type Menu } from '@/store/menu';
import { fonts, useTheme } from '@/theme';
import { Txt } from './ui';

/** Mount once at the root. Renders whatever menu `useMenu` holds. */
export function MenuHost() {
  const menu = useMenu((s) => s.menu);
  if (!menu) return null;
  return <MenuView menu={menu} />;
}

function MenuView({ menu }: { menu: Menu }) {
  const { c, isDark } = useTheme();
  const close = useMenu((s) => s.close);
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [p]);

  const dismiss = (then?: () => void) => {
    p.set(withTiming(0, { duration: 150 }));
    setTimeout(() => {
      close();
      then?.();
    }, 150);
  };

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const card = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: interpolate(p.value, [0, 1], [0.94, 1]) }] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(241,238,231,0.45)' }]} onPress={() => dismiss()} />
      </Animated.View>
      <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
        <Animated.View style={[{ gap: 12 }, card]}>
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.borderStrong,
              borderLeftWidth: menu.color ? 4 : 1,
              borderLeftColor: menu.color ?? c.borderStrong,
              padding: 18,
              gap: 4,
            }}
          >
            {menu.kicker ? <Txt variant="label">{menu.kicker}</Txt> : null}
            <Txt variant="title" style={{ fontSize: 20, lineHeight: 26 }}>
              {menu.title}
            </Txt>
            {menu.subtitle ? (
              <Txt variant="small" color={c.textDim}>
                {menu.subtitle}
              </Txt>
            ) : null}
          </View>
          <View style={{ width: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: isDark ? '#1C1C1F' : '#FFFFFF', borderWidth: 1, borderColor: c.border }}>
            {menu.actions.map((a, i) => (
              <Pressable
                key={a.label}
                onPress={() => dismiss(a.run)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  height: 48,
                  backgroundColor: pressed ? c.surface2 : 'transparent',
                  borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                  borderTopColor: c.border,
                })}
              >
                <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 16, color: a.danger ? c.danger : c.text }}>{a.label}</Text>
                <Ionicons name={a.icon} size={19} color={a.danger ? c.danger : c.text} />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
