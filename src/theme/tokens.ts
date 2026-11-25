export type ThemeMode = 'system' | 'dark' | 'light';
export type AccentKey = 'ember' | 'gold' | 'blood' | 'steel' | 'volt';

export interface Palette {
  bg: string;
  bgElevated: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  danger: string;
  success: string;
  scrim: string;
}

export const DARK: Palette = {
  bg: '#09090A',
  bgElevated: '#0E0E10',
  surface: '#131315',
  surface2: '#1A1A1D',
  surface3: '#242428',
  border: '#212125',
  borderStrong: '#323238',
  text: '#F2EEE6',
  textDim: '#9A968D',
  textFaint: '#5A5751',
  danger: '#FF4D4D',
  success: '#45D483',
  scrim: 'rgba(0,0,0,0.72)',
};

export const LIGHT: Palette = {
  bg: '#F1EEE7',
  bgElevated: '#F6F4EF',
  surface: '#FBFAF7',
  surface2: '#EAE6DD',
  surface3: '#DEDAD0',
  border: '#E0DBD0',
  borderStrong: '#C9C3B6',
  text: '#111112',
  textDim: '#67635B',
  textFaint: '#A6A196',
  danger: '#D92D2D',
  success: '#1F9D57',
  scrim: 'rgba(17,17,18,0.45)',
};

/** Accent colours. `dark`/`light` = accent on that theme, `on*` = text colour on top of an accent fill. */
export const ACCENTS: Record<
  AccentKey,
  { name: string; dark: string; light: string; onDark: string; onLight: string }
> = {
  ember: { name: 'EMBER', dark: '#FF5A1F', light: '#E04A10', onDark: '#0A0A0B', onLight: '#FFFFFF' },
  gold: { name: 'GOLD', dark: '#D8AA45', light: '#A67812', onDark: '#0A0A0B', onLight: '#FFFFFF' },
  blood: { name: 'BLOOD', dark: '#E8393E', light: '#C41E24', onDark: '#FFFFFF', onLight: '#FFFFFF' },
  steel: { name: 'STEEL', dark: '#A3B8CC', light: '#46627C', onDark: '#0A0A0B', onLight: '#FFFFFF' },
  volt: { name: 'VOLT', dark: '#C9F03F', light: '#587500', onDark: '#0A0A0B', onLight: '#FFFFFF' },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export const fonts = {
  display: 'BebasNeue_400Regular',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const radius = { xs: 6, sm: 10, md: 14, lg: 20, pill: 999 } as const;
export const space = (n: number) => n * 4;

/** Add alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${v}`;
}
