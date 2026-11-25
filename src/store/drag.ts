import { create } from 'zustand';

/**
 * While a task is being dragged the screen must not scroll under your finger.
 * `heldAt` lets rows ignore the tap that ends a press-and-hold.
 */
export const useDrag = create<{ dragging: boolean; heldAt: number }>(() => ({ dragging: false, heldAt: 0 }));

export const setDragging = (dragging: boolean) => useDrag.setState({ dragging, heldAt: Date.now() });

/** Call the moment a press-and-hold ends (before any drop animation). */
export const markHeld = () => useDrag.setState({ heldAt: Date.now() });

/** True during a drag and right after a press-and-hold: the release must not also count as a tap. */
export const justHeld = () => {
  const { dragging, heldAt } = useDrag.getState();
  return dragging || Date.now() - heldAt < 450;
};
