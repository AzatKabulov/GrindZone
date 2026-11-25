import type { IconName } from '@/components/Icon';
import type { Palette } from '@/theme/tokens';

export type BlockCategory = 'deep' | 'train' | 'learn' | 'build' | 'admin' | 'recover' | 'social';

/** `color: null` means "use the accent colour". Otherwise a key of the system palette. */
export const BLOCK_CATEGORIES: Record<
  BlockCategory,
  { label: string; color: keyof Palette | null; icon: IconName }
> = {
  deep: { label: 'Deep Work', color: null, icon: 'deep' },
  train: { label: 'Training', color: 'red', icon: 'train' },
  learn: { label: 'Learning', color: 'blue', icon: 'learn' },
  build: { label: 'Building', color: 'yellow', icon: 'build' },
  admin: { label: 'Admin', color: 'gray', icon: 'admin' },
  recover: { label: 'Recovery', color: 'green', icon: 'recover' },
  social: { label: 'Social', color: 'purple', icon: 'social' },
};

export const BLOCK_CATEGORY_KEYS = Object.keys(BLOCK_CATEGORIES) as BlockCategory[];

export function blockColor(cat: BlockCategory, c: Palette, accent: string): string {
  const key = BLOCK_CATEGORIES[cat]?.color;
  return key ? c[key] : accent;
}

export type GoalCategory = 'body' | 'mind' | 'wealth' | 'craft' | 'spirit' | 'social';

export const GOAL_CATEGORIES: Record<GoalCategory, { label: string; icon: IconName; color: keyof Palette }> = {
  body: { label: 'Body', icon: 'body', color: 'red' },
  mind: { label: 'Mind', icon: 'mind', color: 'purple' },
  wealth: { label: 'Wealth', icon: 'wealth', color: 'green' },
  craft: { label: 'Craft', icon: 'craft', color: 'orange' },
  spirit: { label: 'Spirit', icon: 'spirit', color: 'yellow' },
  social: { label: 'Brotherhood', icon: 'brotherhood', color: 'blue' },
};

export const GOAL_CATEGORY_KEYS = Object.keys(GOAL_CATEGORIES) as GoalCategory[];

export const PRIORITIES = {
  1: { name: 'High', marks: '!!!' },
  2: { name: 'Medium', marks: '' },
  3: { name: 'Low', marks: '' },
} as const;
