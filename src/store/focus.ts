import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { cancelFocusAlerts, scheduleFocusAlerts } from '@/lib/notify';
import { useFx } from './fx';

/**
 * Pomodoro timer. Time is tracked as an end timestamp, so it keeps counting while the app is in
 * the background or the phone is locked; `tick()` catches up whenever the app is active.
 */

export type FocusPhase = 'focus' | 'break';

interface FocusState {
  focusMin: number;
  breakMin: number;
  phase: FocusPhase;
  running: boolean;
  /** Epoch ms when the current phase ends (while running). */
  endsAt: number | null;
  /** Time left in the current phase while paused / not started. */
  remainingMs: number;
  /** Focus sessions finished since the last reset. */
  round: number;
  taskId: string | null;
  /** Focus sessions finished per day (YYYY-MM-DD). */
  history: Record<string, number>;

  setLengths: (p: { focusMin?: number; breakMin?: number }) => void;
  setTask: (taskId: string | null) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
}

const mins = (m: number) => m * 60_000;

export function remainingOf(s: Pick<FocusState, 'running' | 'endsAt' | 'remainingMs'>, now = Date.now()) {
  return s.running && s.endsAt ? Math.max(0, s.endsAt - now) : s.remainingMs;
}

function alertsFor(s: FocusState, endsAt: number) {
  if (s.phase === 'focus') {
    return [
      { at: endsAt, title: 'Focus session done 🔥', body: `Take a ${s.breakMin}-minute break.` },
      { at: endsAt + mins(s.breakMin), title: 'Break over', body: 'Ready for the next round?' },
    ];
  }
  return [{ at: endsAt, title: 'Break over', body: 'Ready for the next round?' }];
}

export const useFocus = create<FocusState>()(
  persist(
    (set, get) => ({
      focusMin: 25,
      breakMin: 5,
      phase: 'focus',
      running: false,
      endsAt: null,
      remainingMs: mins(25),
      round: 0,
      taskId: null,
      history: {},

      setLengths: ({ focusMin, breakMin }) => {
        const s = get();
        if (s.running) return;
        const f = focusMin ?? s.focusMin;
        const b = breakMin ?? s.breakMin;
        set({
          focusMin: f,
          breakMin: b,
          remainingMs: s.phase === 'focus' ? mins(f) : mins(b),
        });
      },

      setTask: (taskId) => set({ taskId }),

      start: () => {
        const s = get();
        if (s.running) return;
        const endsAt = Date.now() + (s.remainingMs > 0 ? s.remainingMs : mins(s.phase === 'focus' ? s.focusMin : s.breakMin));
        set({ running: true, endsAt });
        haptic.medium();
        void scheduleFocusAlerts(alertsFor(get(), endsAt));
      },

      pause: () => {
        const s = get();
        if (!s.running) return;
        set({ running: false, remainingMs: remainingOf(s), endsAt: null });
        haptic.light();
        void cancelFocusAlerts();
      },

      reset: () => {
        set({ phase: 'focus', running: false, endsAt: null, remainingMs: mins(get().focusMin), round: 0 });
        haptic.light();
        void cancelFocusAlerts();
      },

      skip: () => {
        const s = get();
        const next: FocusPhase = s.phase === 'focus' ? 'break' : 'focus';
        set({ phase: next, running: false, endsAt: null, remainingMs: mins(next === 'focus' ? s.focusMin : s.breakMin) });
        haptic.light();
        void cancelFocusAlerts();
      },

      tick: () => {
        const s = get();
        if (!s.running || !s.endsAt || Date.now() < s.endsAt) return;
        const now = Date.now();
        if (s.phase === 'focus') {
          // Focus finished: count it and roll straight into the break (which may already be over).
          const day = todayKey();
          const breakEnd = s.endsAt + mins(s.breakMin);
          const history = { ...s.history, [day]: (s.history[day] ?? 0) + 1 };
          if (now < breakEnd) {
            set({ phase: 'break', running: true, endsAt: breakEnd, remainingMs: mins(s.breakMin), round: s.round + 1, history });
          } else {
            set({ phase: 'focus', running: false, endsAt: null, remainingMs: mins(s.focusMin), round: s.round + 1, history });
          }
          haptic.celebrate();
          useFx.getState().cheer(`FOCUS SESSION ${s.round + 1} DONE · BREAK TIME`);
        } else {
          set({ phase: 'focus', running: false, endsAt: null, remainingMs: mins(s.focusMin) });
          haptic.success();
          useFx.getState().info('BREAK OVER', `Ready for round ${s.round + 1}? Hit start.`);
        }
      },
    }),
    {
      name: 'gz-focus',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ setLengths, setTask, start, pause, reset, skip, tick, ...rest }) => rest,
    },
  ),
);
