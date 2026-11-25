import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type BlockCategory = 'deep' | 'train' | 'learn' | 'build' | 'admin' | 'recover' | 'social';

/** `color: null` means "use the accent colour". */
export const BLOCK_CATEGORIES: Record<
  BlockCategory,
  { label: string; color: string | null; icon: IconName }
> = {
  deep: { label: 'DEEP WORK', color: null, icon: 'flash' },
  train: { label: 'TRAINING', color: '#E5484D', icon: 'barbell' },
  learn: { label: 'LEARN', color: '#6E9CF5', icon: 'book' },
  build: { label: 'BUILD', color: '#D9A53A', icon: 'hammer' },
  admin: { label: 'ADMIN', color: '#8D8D93', icon: 'briefcase' },
  recover: { label: 'RECOVER', color: '#4DB38A', icon: 'leaf' },
  social: { label: 'SOCIAL', color: '#B07CE8', icon: 'people' },
};

export const BLOCK_CATEGORY_KEYS = Object.keys(BLOCK_CATEGORIES) as BlockCategory[];

export function blockColor(cat: BlockCategory, accent: string): string {
  return BLOCK_CATEGORIES[cat]?.color ?? accent;
}

export type GoalCategory = 'body' | 'mind' | 'wealth' | 'craft' | 'spirit' | 'social';

export const GOAL_CATEGORIES: Record<GoalCategory, { label: string; icon: IconName }> = {
  body: { label: 'BODY', icon: 'barbell' },
  mind: { label: 'MIND', icon: 'bulb' },
  wealth: { label: 'WEALTH', icon: 'cash' },
  craft: { label: 'CRAFT', icon: 'hammer' },
  spirit: { label: 'SPIRIT', icon: 'flame' },
  social: { label: 'BROTHERHOOD', icon: 'people' },
};

export const GOAL_CATEGORY_KEYS = Object.keys(GOAL_CATEGORIES) as GoalCategory[];

export const PRIORITIES = {
  1: { label: 'P1', name: 'HIGH' },
  2: { label: 'P2', name: 'MED' },
  3: { label: 'P3', name: 'LOW' },
} as const;
