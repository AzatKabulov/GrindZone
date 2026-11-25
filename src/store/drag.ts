import { create } from 'zustand';

/**
 * While a task is being dragged the screen must not scroll under your finger.
 * `heldAt` lets rows ignore the tap that ends a press-and-hold.
 */
export const useDrag = create<{ dragging: boolean; heldAt: number; busyUntil: number }>(() => ({
  dragging: false,
  heldAt: 0,
  busyUntil: 0,
}));

export const setDragging = (dragging: boolean) => useDrag.setState({ dragging, heldAt: Date.now() });

/** Call the moment a press-and-hold ends (before any drop animation). */
export const markHeld = () => useDrag.setState({ heldAt: Date.now() });

/** A swipe is under way (or just ended): taps on rows are ignored until `ms` from now. */
export const markBusy = (ms: number) => useDrag.setState({ busyUntil: Date.now() + ms });

/** True during a drag or swipe and right after one: the release must not also count as a tap. */
export const justHeld = () => {
  const { dragging, heldAt, busyUntil } = useDrag.getState();
  return dragging || Date.now() - heldAt < 450 || Date.now() < busyUntil;
};

/** The task row that is swiped open to show Delete (only one at a time). */
export const useSwipeOpen = create<{ openId: string }>(() => ({ openId: '' }));

export const closeSwipes = () => {
  if (useSwipeOpen.getState().openId) useSwipeOpen.setState({ openId: '' });
};
