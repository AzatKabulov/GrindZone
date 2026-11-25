import { Platform, type TextStyle } from 'react-native';

/*
 * Design tokens modelled on Apple's Human Interface Guidelines:
 * system colours, semantic label/fill colours and the iOS Dynamic Type scale.
 * On iOS we use the real system fonts — SF Pro, SF Pro Rounded, New York and SF Mono.
 */

export type ThemeMode = 'system' | 'dark' | 'light';
export type AccentKey = 'orange' | 'red' | 'green' | 'blue' | 'indigo' | 'graphite';

export interface Palette {
  /** Screen background (systemGroupedBackground). */
  bg: string;
  /** Cards & grouped rows (secondarySystemGroupedBackground). */
  card: string;
  /** Controls inside cards (tertiarySystemGroupedBackground). */
  card2: string;
  /** Neutral fills: tracks, chips, unchecked states. */
  fill: string;
  fill2: string;
  separator: string;
  label: string;
  label2: string;
  label3: string;
  label4: string;
  red: string;
  orange: string;
  yellow: string;
  green: string;
  mint: string;
  teal: string;
  cyan: string;
  blue: string;
  indigo: string;
  purple: string;
  pink: string;
  gray: string;
  scrim: string;
}

export const DARK: Palette = {
  bg: '#000000',
  card: '#1C1C1E',
  card2: '#2C2C2E',
  fill: '#3A3A3C',
  fill2: '#2C2C2E',
  separator: '#38383A',
  label: '#FFFFFF',
  label2: '#98989F',
  label3: '#5B5B60',
  label4: '#404044',
  red: '#FF453A',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  green: '#30D158',
  mint: '#63E6E2',
  teal: '#40C8E0',
  cyan: '#64D2FF',
  blue: '#0A84FF',
  indigo: '#5E5CE6',
  purple: '#BF5AF2',
  pink: '#FF375F',
  gray: '#8E8E93',
  scrim: 'rgba(0,0,0,0.55)',
};

export const LIGHT: Palette = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  card2: '#F2F2F7',
  fill: '#E5E5EA',
  fill2: '#EFEFF4',
  separator: '#D8D8DC',
  label: '#000000',
  label2: '#8A8A8E',
  label3: '#C4C4C7',
  label4: '#DCDCE0',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  green: '#34C759',
  mint: '#00C7BE',
  teal: '#30B0C7',
  cyan: '#32ADE6',
  blue: '#007AFF',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
  gray: '#8E8E93',
  scrim: 'rgba(0,0,0,0.3)',
};

export const ACCENTS: Record<AccentKey, { name: string; dark: string; light: string }> = {
  orange: { name: 'Orange', dark: '#FF9F0A', light: '#FF9500' },
  red: { name: 'Red', dark: '#FF453A', light: '#FF3B30' },
  green: { name: 'Green', dark: '#30D158', light: '#34C759' },
  blue: { name: 'Blue', dark: '#0A84FF', light: '#007AFF' },
  indigo: { name: 'Indigo', dark: '#5E5CE6', light: '#5856D6' },
  graphite: { name: 'Graphite', dark: '#8E8E93', light: '#6C6C70' },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

/* ───────────────────────────── Typography ───────────────────────────── */

export type TextVariant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'caption2';

/** iOS Dynamic Type sizes at the default "Large" setting. */
export const TYPE: Record<TextVariant, { size: number; line: number; weight: Weight; tracking: number }> = {
  largeTitle: { size: 34, line: 41, weight: '700', tracking: 0.4 },
  title1: { size: 28, line: 34, weight: '700', tracking: 0.36 },
  title2: { size: 22, line: 28, weight: '700', tracking: 0.35 },
  title3: { size: 20, line: 25, weight: '600', tracking: 0.38 },
  headline: { size: 17, line: 22, weight: '600', tracking: -0.43 },
  body: { size: 17, line: 22, weight: '400', tracking: -0.43 },
  callout: { size: 16, line: 21, weight: '400', tracking: -0.31 },
  subhead: { size: 15, line: 20, weight: '400', tracking: -0.23 },
  footnote: { size: 13, line: 18, weight: '400', tracking: -0.08 },
  caption: { size: 12, line: 16, weight: '400', tracking: 0 },
  caption2: { size: 11, line: 13, weight: '400', tracking: 0.06 },
};

export type Weight = '400' | '500' | '600' | '700' | '800';
export type Design = 'default' | 'rounded' | 'serif' | 'mono';

const IOS_FAMILY: Record<Design, string | undefined> = {
  default: undefined, // SF Pro
  rounded: 'ui-rounded', // SF Pro Rounded
  serif: 'ui-serif', // New York
  mono: 'ui-monospace', // SF Mono
};

const INTER: Record<Weight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_700Bold',
};

const SERIF: Record<Weight, string> = {
  '400': 'Newsreader_400Regular',
  '500': 'Newsreader_500Medium',
  '600': 'Newsreader_600SemiBold',
  '700': 'Newsreader_600SemiBold',
  '800': 'Newsreader_600SemiBold',
};

/** Font family + weight for the platform. iOS gets the real Apple system fonts. */
export function font(weight: Weight = '400', design: Design = 'default', italic = false): TextStyle {
  if (Platform.OS === 'ios') {
    return {
      fontFamily: IOS_FAMILY[design],
      fontWeight: weight,
      fontStyle: italic ? 'italic' : 'normal',
    };
  }
  if (design === 'serif') {
    return { fontFamily: italic ? `${SERIF[weight]}_Italic` : SERIF[weight] };
  }
  if (design === 'mono') return { fontFamily: 'monospace', fontWeight: weight };
  return { fontFamily: INTER[weight] };
}

/** Add alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${v}`;
}

/** Mix a #RRGGBB colour towards white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  const t = amt > 0 ? 255 : 0;
  const k = Math.abs(amt);
  const ch = (v: number) => Math.round(v + (t - v) * k).toString(16).padStart(2, '0');
  return `#${ch(n(1))}${ch(n(3))}${ch(n(5))}`;
}

/** Blend colour `a` over solid background `b` (both #RRGGBB) at opacity t — an opaque tint. */
export function mix(a: string, b: string, t: number): string {
  const n = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const ch = (i: number) => Math.round(n(a, i) * t + n(b, i) * (1 - t)).toString(16).padStart(2, '0');
  return `#${ch(1)}${ch(3)}${ch(5)}`;
}

/** Continuous ("squircle") corners on iOS, like every Apple UI surface. */
export const squircle = Platform.OS === 'ios' ? ({ borderCurve: 'continuous' } as const) : {};
