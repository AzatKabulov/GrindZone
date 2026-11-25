import { create } from 'zustand';

import type { IconName } from '@/components/ui';

export interface MenuAction {
  label: string;
  icon: IconName;
  danger?: boolean;
  run: () => void;
}

export interface Menu {
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Accent for the card's edge (e.g. a time block's category colour). */
  color?: string;
  actions: MenuAction[];
}

/** Press-and-hold menu (blurred background, card in the middle, actions underneath). */
export const useMenu = create<{ menu: Menu | null; open: (m: Menu) => void; close: () => void }>((set) => ({
  menu: null,
  open: (menu) => set({ menu }),
  close: () => set({ menu: null }),
}));
