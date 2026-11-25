/**
 * How productive a day was, as a colour from red to green.
 * Four steps (validated for colour-vision deficiency on the dark surface); the calendar always shows
 * done/total next to the colour, so the colour is never the only signal.
 */

const DARK = ['#E54848', '#F39A2B', '#B4E27C', '#17A34A'];
const LIGHT = ['#D93636', '#E0861A', '#7CC24A', '#138A3E'];

export const LEVEL_LABELS = ['Rough day', 'Medium', 'Strong', 'All done'];
export const LEVEL_RANGES = ['< 40%', '40–74%', '75–99%', '100%'];

/** 0 = rough (< 40%), 1 = medium (40–74%), 2 = strong (75–99%), 3 = everything done. */
export function levelOf(ratio: number): 0 | 1 | 2 | 3 {
  if (ratio >= 1) return 3;
  if (ratio >= 0.75) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}

export function levelColor(level: number, isDark: boolean): string {
  return (isDark ? DARK : LIGHT)[level];
}

export function productivityColor(ratio: number, isDark: boolean): string {
  return levelColor(levelOf(ratio), isDark);
}

/** Text on top of a level colour: near-black on the light steps, white on the dark ones. */
export function onLevel(level: number, isDark: boolean): string {
  if (isDark) return level === 0 || level === 3 ? '#FFFFFF' : '#0A0A0B';
  return '#FFFFFF';
}

/* Smooth progress colour: red → orange → amber → lime → green (100%). */
const STOPS_DARK: [number, string][] = [
  [0, '#EF4444'],
  [0.35, '#F97316'],
  [0.65, '#F59E0B'],
  [0.85, '#A3E635'],
  [1, '#22C55E'],
];
const STOPS_LIGHT: [number, string][] = [
  [0, '#DC2626'],
  [0.35, '#EA580C'],
  [0.65, '#D97706'],
  [0.85, '#65A30D'],
  [1, '#16A34A'],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

export function progressColor(value: number, isDark = true): string {
  const stops = isDark ? STOPS_DARK : STOPS_LIGHT;
  const v = Math.max(0, Math.min(1, value));
  for (let i = 1; i < stops.length; i++) {
    const [b, cb] = stops[i];
    const [a, ca] = stops[i - 1];
    if (v <= b) {
      const t = (v - a) / (b - a || 1);
      const A = hex(ca);
      const B = hex(cb);
      return toHex(A.map((x, k) => x + (B[k] - x) * t));
    }
  }
  return stops[stops.length - 1][1];
}

/** Darken (f < 1) or lighten (f > 1) a #RRGGBB colour. */
export function shade(color: string, f: number): string {
  const rgb = hex(color);
  return toHex(f < 1 ? rgb.map((x) => x * f) : rgb.map((x) => x + (255 - x) * (f - 1)));
}
