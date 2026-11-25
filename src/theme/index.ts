import { useEffect, useMemo } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';
import { ACCENTS, DARK, LIGHT, type AccentKey, type Palette } from './tokens';

export * from './tokens';

export interface Theme {
  c: Palette;
  isDark: boolean;
  accent: string;
  onAccent: string;
  accentKey: AccentKey;
}

export function buildTheme(isDark: boolean, key: AccentKey): Theme {
  const accentKey: AccentKey = key in ACCENTS ? key : 'orange';
  const a = ACCENTS[accentKey];
  return {
    c: isDark ? DARK : LIGHT,
    isDark,
    accent: isDark ? a.dark : a.light,
    onAccent: '#FFFFFF',
    accentKey,
  };
}

export function useTheme(): Theme {
  const mode = useSettings((s) => s.mode);
  const accentKey = useSettings((s) => s.accent);
  const scheme = useColorScheme();
  const isDark = mode === 'system' ? scheme !== 'light' : mode === 'dark';
  return useMemo(() => buildTheme(isDark, accentKey), [isDark, accentKey]);
}

/** Keeps native UI (keyboard, alerts, pickers, tab bar) in sync with the in-app theme override. */
export function useApplyAppearance() {
  const mode = useSettings((s) => s.mode);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);
}
