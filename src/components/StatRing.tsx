import { View } from 'react-native';

import { useTheme } from '@/theme';
import { ProgressRing } from './ProgressRing';
import { Txt } from './ui';

/** A small percentage ring with a label underneath, for screen headers. `value` null = nothing to measure yet. */
export function StatRing({ value, label, color }: { value: number | null; label: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 5, marginBottom: 4 }} accessibilityLabel={`${label}: ${value === null ? 'nothing yet' : `${Math.round(value * 100)} percent`}`}>
      <ProgressRing value={value ?? 0} size={50} stroke={5} color={color}>
        <Txt variant="h2" style={{ fontSize: value !== null && value >= 1 ? 14 : 16, marginTop: 2 }} color={value === null ? c.textFaint : c.text}>
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </Txt>
      </ProgressRing>
      <Txt variant="label" style={{ fontSize: 8.5 }}>
        {label}
      </Txt>
    </View>
  );
}
