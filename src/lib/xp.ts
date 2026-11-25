export type Priority = 1 | 2 | 3;

export const XP = {
  task: { 1: 30, 2: 20, 3: 10 } as Record<Priority, number>,
  block: 15,
  goal: 250,
};

/** Cumulative XP needed to reach level L (L1 = 0, L2 = 100, L3 = 300, L4 = 600 ...). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

const RANKS: [number, string][] = [
  [1, 'Recruit'],
  [3, 'Grinder'],
  [5, 'Operator'],
  [8, 'Hunter'],
  [11, 'Veteran'],
  [15, 'Elite'],
  [20, 'Apex'],
  [25, 'Titan'],
  [30, 'Legend'],
];

export function rankFor(level: number): string {
  let name = RANKS[0][1];
  for (const [min, r] of RANKS) if (level >= min) name = r;
  return name;
}

export interface LevelInfo {
  xp: number;
  level: number;
  rank: string;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level spans. */
  span: number;
  progress: number;
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    xp,
    level,
    rank: rankFor(level),
    into: xp - base,
    span: next - base,
    progress: (xp - base) / (next - base),
  };
}

/** 12345 -> '12,345' (no Intl dependency). */
export function fmtNum(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
