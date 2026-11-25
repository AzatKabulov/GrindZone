import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type BlockCategory = 'deep' | 'train' | 'learn' | 'build' | 'admin' | 'recover' | 'social';

/** `color: null` means "use the accent colour". */
export const BLOCK_CATEGORIES: Record<
  BlockCategory,
  { label: string; color: string | null; icon: IconName }
> = {
  deep: { label: 'WORK', color: null, icon: 'flash' },
  train: { label: 'TRAINING', color: '#E5484D', icon: 'barbell' },
  learn: { label: 'LEARNING', color: '#6E9CF5', icon: 'book' },
  recover: { label: 'REST', color: '#4DB38A', icon: 'leaf' },
  social: { label: 'PERSONAL', color: '#B07CE8', icon: 'people' },
  // Older categories: still shown on existing blocks, no longer offered when creating new ones.
  build: { label: 'BUILD', color: '#D9A53A', icon: 'hammer' },
  admin: { label: 'ADMIN', color: '#8D8D93', icon: 'briefcase' },
};

/** Categories offered in the block editor — kept short on purpose. */
export const BLOCK_CATEGORY_KEYS: BlockCategory[] = ['deep', 'train', 'learn', 'recover', 'social'];

export function blockColor(cat: BlockCategory, accent: string): string {
  return BLOCK_CATEGORIES[cat]?.color ?? accent;
}

/** Tasks are either normal or important (priority 1). Priority 3 from older data counts as normal. */
export const isImportant = (priority: number) => priority === 1;

/** Stored on goals for older data; no longer shown in the UI. */
export type GoalCategory = 'body' | 'mind' | 'wealth' | 'craft' | 'spirit' | 'social';
