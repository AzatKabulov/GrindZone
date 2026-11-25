import { create } from 'zustand';

/** Visual rewards: floating XP toasts and full-screen celebrations. */

export interface Toast {
  id: number;
  text: string;
  sub?: string;
}

export type OverlayKind = 'levelup' | 'daywon' | 'goal';

export interface Overlay {
  id: number;
  kind: OverlayKind;
  kicker: string;
  title: string;
  subtitle: string;
}

interface FxState {
  toasts: Toast[];
  overlay: Overlay | null;
  toast: (text: string, sub?: string) => void;
  celebrate: (o: Omit<Overlay, 'id'>) => void;
  dismiss: () => void;
}

let seq = 1;
let overlayTimer: ReturnType<typeof setTimeout> | undefined;

export const useFx = create<FxState>((set, get) => ({
  toasts: [],
  overlay: null,
  toast: (text, sub) => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, sub }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 1900);
  },
  celebrate: (o) => {
    const id = seq++;
    // A level-up beats a day-won if both fire on the same tap; never stack overlays.
    const cur = get().overlay;
    if (cur && cur.kind === 'levelup' && o.kind !== 'goal') return;
    set({ overlay: { ...o, id } });
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => {
      if (get().overlay?.id === id) set({ overlay: null });
    }, 6000);
  },
  dismiss: () => {
    clearTimeout(overlayTimer);
    set({ overlay: null });
  },
}));
