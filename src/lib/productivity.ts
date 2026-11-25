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
