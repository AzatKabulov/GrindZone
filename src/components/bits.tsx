import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/store/auth';
import { useSync } from '@/store/sync';
import { alpha, fonts, useTheme } from '@/theme';
import { Txt } from './ui';

export function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [t]);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - t.value),
    transform: [{ scale: 1 + t.value * 1.8 }],
  }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, halo]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export function SyncBadge() {
  const { c, accent } = useTheme();
  const session = useAuth((s) => s.session);
  const status = useSync((s) => s.status);
  const last = useSync((s) => s.lastSyncedAt);

  let label = 'LOCAL';
  let color = c.textFaint;
  if (session) {
    if (status === 'syncing') {
      label = 'SYNCING';
      color = accent;
    } else if (status === 'error') {
      label = 'SYNC ERROR';
      color = c.danger;
    } else if (status === 'offline') {
      label = 'OFFLINE';
      color = c.textDim;
    } else if (last) {
      label = 'SYNCED';
      color = c.success;
    } else {
      label = 'CLOUD';
      color = c.textDim;
    }
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 10,
        height: 28,
        borderRadius: 14,
        backgroundColor: alpha(color, 0.1),
        borderWidth: 1,
        borderColor: alpha(color, 0.25),
      }}
    >
      {status === 'syncing' && session ? <PulseDot color={color} size={6} /> : (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      )}
      <Txt style={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.3, color }}>{label}</Txt>
    </View>
  );
}
