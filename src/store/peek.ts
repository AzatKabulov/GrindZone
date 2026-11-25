import { create } from 'zustand';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Press-and-hold preview of a task (zooms out of its row, background blurs). */
export const usePeek = create<{
  taskId: string | null;
  origin: Rect | null;
  open: (taskId: string, origin: Rect | null) => void;
  close: () => void;
}>((set) => ({
  taskId: null,
  origin: null,
  open: (taskId, origin) => set({ taskId, origin }),
  close: () => set({ taskId: null, origin: null }),
}));
