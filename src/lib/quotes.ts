import { dayOfYear } from './date';

/** Short headline mantras for the Today screen. The last word gets the accent. */
export const MANTRAS = [
  'LOCK IN',
  'NO ZERO DAYS',
  'SILENCE. FOCUS. EXECUTE',
  'COMFORT IS THE ENEMY',
  'WIN THE MORNING',
  'THE WORK IS THE REWARD',
  'BUILT, NOT BORN',
  'OUTWORK YESTERDAY',
  'DO IT TIRED',
  'EARN YOUR SLEEP',
  'STACK THE DAYS',
  'QUIET GRIND. LOUD RESULTS',
  'SYSTEMS OVER MOOD',
  'ONE MORE REP',
  'BE UNREASONABLE',
  'NOBODY IS COMING',
];

export function mantraOfTheDay(d = new Date()): string {
  return MANTRAS[dayOfYear(d) % MANTRAS.length];
}

export const COMPLETION_LINES = [
  'ZERO EXCUSES. ZERO LEFT.',
  'EXECUTED.',
  'NOTHING LEFT ON THE TABLE.',
  'THAT IS HOW IT IS DONE.',
];
