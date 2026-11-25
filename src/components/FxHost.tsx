import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFx, type Overlay } from '@/store/fx';
import { alpha, shade, squircle, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Button, Txt } from './ui';

/** XP toasts (Dynamic Island style) and full-screen awards. Mount at the root (and inside native modals). */
export function FxHost() {
  const toasts = useFx((s) => s.toasts);
  const overlay = useFx((s) => s.overlay);
  const insets = useSafeAreaInsets();
  const { accent } = useTheme();
  // On Dynamic Island iPhones the toast grows out of the island itself.
  const top = insets.top >= 50 ? 11 : insets.top + 6;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {overlay ? <Award key={overlay.id} overlay={overlay} /> : null}
      <View pointerEvents="none" style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center', gap: 8 }}>
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={ZoomIn.springify().damping(15).stiffness(220)}
            exiting={ZoomOut.duration(220)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              height: 46,
              paddingLeft: 8,
              paddingRight: 20,
              borderRadius: 23,
              backgroundColor: '#000000',
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="today" size={15} color="#FFFFFF" weight="bold" />
            </View>
            <View>
              <Txt variant="headline" design="rounded" tabular color="#FFFFFF" style={{ lineHeight: 19 }}>
                {t.text}
              </Txt>
              {t.sub ? (
                <Txt variant="caption" color="#98989F" style={{ lineHeight: 14 }}>
                  {t.sub}
                </Txt>
              ) : null}
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

/** Deterministic pseudo-random in [0, 1) — keeps render pure while every burst looks different. */
function noise(seed: number, i: number, k: number): number {
  const x = Math.sin(seed * 374.761 + i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const CONFETTI = 44;

function Award({ overlay }: { overlay: Overlay }) {
  const { c, accent, isDark } = useTheme();
  const dismiss = useFx((s) => s.dismiss);

  const palette = useMemo(() => [accent, c.yellow, c.green, c.blue, c.pink, c.purple, c.cyan], [accent, c]);
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI }, (_, i) => ({
        angle: noise(overlay.id, i, 1) * Math.PI * 2,
        dist: 90 + noise(overlay.id, i, 2) * 190,
        fall: 160 + noise(overlay.id, i, 3) * 260,
        spin: (noise(overlay.id, i, 4) - 0.5) * 720,
        w: 5 + noise(overlay.id, i, 5) * 5,
        h: 9 + noise(overlay.id, i, 6) * 9,
        delay: noise(overlay.id, i, 7) * 160,
        color: palette[i % palette.length],
      })),
    [overlay.id, palette],
  );

  const shine = useSharedValue(-1);
  const float = useSharedValue(0);
  useEffect(() => {
    shine.set(withDelay(450, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })));
    float.set(withRepeat(withSequence(withTiming(1, { duration: 1600 }), withTiming(0, { duration: 1600 })), -1));
  }, [shine, float]);
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shine.value * 190 }, { rotate: '20deg' }] }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * float.value }] }));

  const levelNumber = overlay.kind === 'levelup' ? overlay.title.replace(/\D/g, '') : '';

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(220)} style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={70} tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(242,242,247,0.86)' }]} />

      <View style={styles.center}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {pieces.map((p, i) => (
            <Confetti key={i} {...p} />
          ))}
          <Animated.View entering={ZoomIn.springify().damping(11).stiffness(160).delay(60)} style={floatStyle}>
            <View style={{ borderRadius: 78, shadowColor: accent, shadowOpacity: 0.55, shadowRadius: 36, shadowOffset: { width: 0, height: 10 } }}>
              <LinearGradient
                colors={[shade(accent, 0.35), accent, shade(accent, -0.3)]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={{ width: 156, height: 156, borderRadius: 78, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              >
                <View
                  style={{
                    position: 'absolute',
                    width: 132,
                    height: 132,
                    borderRadius: 66,
                    borderWidth: 2,
                    borderColor: alpha('#FFFFFF', 0.28),
                  }}
                />
                {levelNumber ? (
                  <Txt design="rounded" weight="800" size={68} color="#FFFFFF" tabular style={{ lineHeight: 76 }}>
                    {levelNumber}
                  </Txt>
                ) : (
                  <Icon name={overlay.kind === 'goal' ? 'trophy' : 'flame'} size={64} color="#FFFFFF" weight="semibold" />
                )}
                <Animated.View
                  pointerEvents="none"
                  style={[{ position: 'absolute', left: -60, top: -40, width: 44, height: 240, backgroundColor: alpha('#FFFFFF', 0.22) }, shineStyle]}
                />
              </LinearGradient>
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.delay(220).duration(400)} style={{ alignItems: 'center', marginTop: 34 }}>
          <Txt variant="subhead" weight="600" color={accent}>
            {overlay.kicker}
          </Txt>
          <Txt design="rounded" weight="700" size={38} center numberOfLines={2} adjustsFontSizeToFit style={{ marginTop: 6, lineHeight: 44 }}>
            {overlay.title}
          </Txt>
          <Txt variant="body" color={c.label2} center style={{ marginTop: 8, maxWidth: 300 }}>
            {overlay.subtitle}
          </Txt>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(500).duration(400)} style={{ position: 'absolute', left: 40, right: 40, bottom: 64 }}>
        <Button label="Done" onPress={dismiss} />
      </Animated.View>
    </Animated.View>
  );
}

function Confetti({
  angle,
  dist,
  fall,
  spin,
  w,
  h,
  delay,
  color,
}: {
  angle: number;
  dist: number;
  fall: number;
  spin: number;
  w: number;
  h: number;
  delay: number;
  color: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) })));
  }, [t, delay]);
  const style = useAnimatedStyle(() => {
    const burst = Math.min(1, t.value * 2.2);
    return {
      opacity: t.value < 0.75 ? 1 : 1 - (t.value - 0.75) / 0.25,
      transform: [
        { translateX: Math.cos(angle) * dist * burst },
        { translateY: Math.sin(angle) * dist * burst + fall * t.value * t.value },
        { rotate: `${spin * t.value}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: w, height: h, borderRadius: 2, backgroundColor: color }, squircle, style]}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
});
