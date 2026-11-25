import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFx, type Overlay } from '@/store/fx';
import { alpha, fonts, useTheme } from '@/theme';

/** Renders the quote toast and full-screen celebrations. Mount once at the root (and inside native modals). */
export function FxHost() {
  const toast = useFx((s) => s.toast);
  const overlay = useFx((s) => s.overlay);
  const dismissToast = useFx((s) => s.dismissToast);
  const insets = useSafeAreaInsets();
  const { c, accent, onAccent, isDark } = useTheme();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {overlay ? <Celebration key={overlay.id} overlay={overlay} /> : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 14, right: 14 }}>
        {toast ? (
          <Animated.View key={toast.id} entering={FadeInDown.springify().damping(16)} exiting={FadeOutUp.duration(220)}>
            <Pressable
              onPress={dismissToast}
              style={{
                flexDirection: 'row',
                gap: 12,
                padding: 14,
                borderRadius: 18,
                backgroundColor: isDark ? '#17140F' : '#FFFFFF',
                borderWidth: 1,
                borderColor: alpha(accent, 0.45),
                shadowColor: isDark ? accent : '#000',
                shadowOpacity: isDark ? 0.35 : 0.15,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 8 },
              }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-sharp" size={17} color={onAccent} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, color: accent }}>{toast.label}</Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: c.text }}>{toast.text}</Text>
                {toast.by ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: c.textDim }}>— {toast.by}</Text>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const PARTICLES = 34;

/** Deterministic pseudo-random in [0, 1) — keeps render pure while every burst looks different. */
function noise(seed: number, i: number, k: number): number {
  const x = Math.sin(seed * 374.761 + i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Celebration({ overlay }: { overlay: Overlay }) {
  const { c, accent, isDark } = useTheme();
  const dismiss = useFx((s) => s.dismiss);
  const icon = overlay.kind === 'goal' ? 'trophy' : 'flame';

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => ({
        angle: (i / PARTICLES) * Math.PI * 2 + noise(overlay.id, i, 1) * 0.3,
        dist: 140 + noise(overlay.id, i, 2) * 170,
        len: 6 + noise(overlay.id, i, 3) * 16,
        delay: noise(overlay.id, i, 4) * 120,
        color: i % 3 === 0 ? c.text : accent,
      })),
    [accent, c.text, overlay.id],
  );

  const wave = useSharedValue(0);
  const title = useSharedValue(0.4);
  useEffect(() => {
    wave.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    title.value = withSequence(
      withTiming(1.12, { duration: 220, easing: Easing.out(Easing.back(2)) }),
      withSpring(1, { damping: 9 }),
    );
  }, [wave, title]);

  const waveStyle = useAnimatedStyle(() => ({
    opacity: 1 - wave.value,
    transform: [{ scale: 0.2 + wave.value * 2.4 }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ scale: title.value }] }));

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(260)}
      style={StyleSheet.absoluteFill}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? 'rgba(5,5,6,0.93)' : 'rgba(241,238,231,0.95)' },
        ]}
      />
      <Pressable style={styles.center} onPress={dismiss}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: 130,
              borderWidth: 3,
              borderColor: accent,
            },
            waveStyle,
          ]}
        />
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
        <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.badge}>
          <View
            style={{
              width: 74,
              height: 74,
              borderRadius: 24,
              backgroundColor: alpha(accent, 0.14),
              borderWidth: 1.5,
              borderColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={36} color={accent} />
          </View>
        </Animated.View>
        <Text style={[styles.kicker, { color: accent }]}>{overlay.kicker}</Text>
        <Animated.Text
          adjustsFontSizeToFit
          numberOfLines={2}
          style={[styles.title, { color: c.text }, titleStyle]}
        >
          {overlay.title}
        </Animated.Text>
        <Text style={[styles.quote, { color: c.text }]}>“{overlay.quote.text}”</Text>
        {overlay.quote.by ? <Text style={[styles.sub, { color: c.textDim }]}>— {overlay.quote.by.toUpperCase()}</Text> : null}
        <Text style={[styles.tap, { color: c.textFaint }]}>TAP TO CONTINUE</Text>
      </Pressable>
    </Animated.View>
  );
}

function Particle({
  angle,
  dist,
  len,
  delay,
  color,
}: {
  angle: number;
  dist: number;
  len: number;
  delay: number;
  color: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.exp) }));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
    transform: [
      { translateX: Math.cos(angle) * dist * t.value },
      { translateY: Math.sin(angle) * dist * t.value },
      { rotate: `${angle + Math.PI / 2}rad` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: 3, height: len, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  badge: { marginBottom: 22 },
  kicker: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 3 },
  title: {
    fontFamily: fonts.display,
    fontSize: 96,
    lineHeight: 92,
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 1,
  },
  quote: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 24, marginTop: 16, textAlign: 'center', maxWidth: 320 },
  sub: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6, marginTop: 10, textAlign: 'center' },
  tap: { position: 'absolute', bottom: 70, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2.4 },
});
