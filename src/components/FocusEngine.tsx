import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { remainingOf, useFocus } from '@/store/focus';
import { alpha, useTheme } from '@/theme';
import { PulseDot } from './bits';
import { Press, Txt } from './ui';

/** Keeps the pomodoro moving (phase changes, break start) while the app is open. Mount once at the root. */
export function FocusEngine() {
  useEffect(() => {
    const tick = () => useFocus.getState().tick();
    tick();
    const t = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);
  return null;
}

/** Small "FOCUS 12:04" pill shown while a pomodoro is in progress. Tap to open the timer. */
export function FocusPill() {
  const { c, accent } = useTheme();
  const st = useFocus();
  const [now, setNow] = useState(() => Date.now());
  const active = st.running || st.round > 0 || st.remainingMs < (st.phase === 'break' ? st.breakMin : st.focusMin) * 60_000;
  useEffect(() => {
    if (!st.running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [st.running]);
  if (!active) return null;
  const col = st.phase === 'break' ? '#4DB38A' : accent;
  const sec = Math.ceil(remainingOf(st, now) / 1000);
  const time = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  return (
    <Press
      tapHaptic
      onPress={() => router.push('/focus')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: alpha(col, 0.45),
        backgroundColor: alpha(col, 0.08),
      }}
    >
      {st.running ? <PulseDot color={col} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.textFaint }} />}
      <Txt variant="label" color={col} style={{ flex: 1 }}>
        {st.phase === 'break' ? 'BREAK' : 'FOCUS'}
        {st.running ? '' : ' · PAUSED'}
      </Txt>
      <Txt variant="h2" color={c.text}>
        {time}
      </Txt>
    </Press>
  );
}
