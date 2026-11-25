import { dayOfYear } from './date';

/** A line for the top of Today. Short, calm, no shouting. */
export const MANTRAS = [
  'Lock in.',
  'No zero days.',
  'Silence. Focus. Execute.',
  'Comfort is the enemy.',
  'Win the morning.',
  'The work is the reward.',
  'Built, not born.',
  'Outwork yesterday.',
  'Do it tired.',
  'Earn your sleep.',
  'Stack the days.',
  'Quiet grind, loud results.',
  'Systems over mood.',
  'One more rep.',
  'Be unreasonable.',
  'Nobody is coming. Go.',
];

export function mantraOfTheDay(d = new Date()): string {
  return MANTRAS[dayOfYear(d) % MANTRAS.length];
}

export const PERFECT_DAY_LINES = [
  'Nothing left on the table.',
  'That’s how it’s done.',
  'Zero excuses. Zero left.',
  'Another day stacked.',
];
