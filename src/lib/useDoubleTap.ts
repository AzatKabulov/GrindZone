import { useEffect, useRef } from 'react';

/**
 * One handler for both: a single tap runs `onSingle` (after a short wait), two quick taps run
 * `onDouble` instead. Use as a Pressable's onPress.
 */
export function useTapOrDoubleTap(onSingle: () => void, onDouble: () => void, delay = 250) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      onDouble();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onSingle();
    }, delay);
  };
}
