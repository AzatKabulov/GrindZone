import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDays, dateKey, fmtMin, monthLong, parseKey, relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { alpha, fonts, useTheme } from '@/theme';
import { Chip, Press, Txt, type IconName } from './ui';

/* ─────────────────────────── Date picker ─────────────────────────── */

export function DatePicker({
  value,
  onChange,
  allowNone = true,
  noneLabel = 'NO DATE',
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  const today = todayKey();
  const quick: { label: string; v: string | null }[] = [
    { label: 'TODAY', v: today },
    { label: 'TOMORROW', v: addDays(today, 1) },
    { label: '+1 WEEK', v: addDays(today, 7) },
  ];
  if (allowNone) quick.push({ label: noneLabel, v: null });
  const isQuick = quick.some((q) => q.v === value);
  const [open, setOpen] = useState(!isQuick && !!value);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {quick.map((q) => (
          <Chip key={q.label} label={q.label} active={value === q.v} onPress={() => onChange(q.v)} />
        ))}
        <Chip
          label={!isQuick && value ? relativeLabel(value) : 'PICK'}
          icon="calendar-outline"
          active={open || (!isQuick && !!value)}
          onPress={() => setOpen((o) => !o)}
        />
      </View>
      {open ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <MiniCalendar value={value} onChange={(v) => onChange(v)} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function MiniCalendar({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  const { c, accent, onAccent } = useTheme();
  const today = todayKey();
  const base = parseKey(value ?? today);
  const [cursor, setCursor] = useState(new Date(base.getFullYear(), base.getMonth(), 1));

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const daysIn = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => {
    haptic.tap();
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  };

  return (
    <View style={{ backgroundColor: c.surface2, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={18} color={c.textDim} />
        </Pressable>
        <Txt variant="h2" style={{ flex: 1, textAlign: 'center', fontSize: 20 }}>
          {monthLong(cursor)} {cursor.getFullYear()}
        </Txt>
        <Pressable onPress={() => shift(1)} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="chevron-forward" size={18} color={c.textDim} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.mono, fontSize: 10, color: c.textFaint }}>
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {cells.map((k, i) => {
          const selected = k && k === value;
          const isToday = k === today;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1.15, padding: 2 }}>
              {k ? (
                <Pressable
                  onPress={() => {
                    haptic.tap();
                    onChange(k);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? accent : 'transparent',
                    borderWidth: isToday && !selected ? 1 : 0,
                    borderColor: accent,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 19,
                      marginTop: 2,
                      color: selected ? onAccent : k < today ? c.textFaint : c.text,
                    }}
                  >
                    {Number(k.slice(8))}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─────────────────────────── Time stepper ─────────────────────────── */

export function TimeStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 1440,
  step = 15,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const { c } = useTheme();
  const valRef = useRef(value);
  valRef.current = value;
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const bump = (dir: number) => {
    const next = Math.max(min, Math.min(max, valRef.current + dir * step));
    if (next !== valRef.current) {
      haptic.tap();
      onChange(next);
    }
  };
  const startRepeat = (dir: number) => {
    stopRepeat();
    timer.current = setInterval(() => bump(dir), 110);
  };
  const stopRepeat = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = undefined;
  };
  useEffect(() => stopRepeat, []);

  const btn = (dir: number, icon: IconName) => (
    <Press
      scaleTo={0.88}
      onPress={() => bump(dir)}
      onLongPress={() => startRepeat(dir)}
      onPressOut={stopRepeat}
      delayLongPress={300}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: c.surface3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={20} color={c.text} />
    </Press>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface2,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.border,
        padding: 12,
        gap: 8,
      }}
    >
      <Txt variant="label">{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {btn(-1, 'remove')}
        <Txt variant="display" style={{ fontSize: 38, lineHeight: 40, marginTop: 4 }}>
          {fmtMin(value)}
        </Txt>
        {btn(1, 'add')}
      </View>
    </View>
  );
}

/* ─────────────────────────── Action sheet ─────────────────────────── */

export interface SheetAction {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
}

export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
            <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(20)}
            exiting={SlideOutDown.duration(180)}
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: c.border,
              paddingTop: 10,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View style={{ alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: c.surface3, marginBottom: 14 }} />
            {title ? (
              <Txt variant="label" style={{ marginBottom: 10, marginLeft: 4 }}>
                {title}
              </Txt>
            ) : null}
            <ScrollView bounces={false} style={{ maxHeight: 420 }}>
              {actions.map((a) => (
                <Press
                  key={a.label}
                  tapHaptic
                  scaleTo={0.98}
                  onPress={() => {
                    onClose();
                    setTimeout(a.onPress, 120);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: c.surface2,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: alpha(a.destructive ? c.danger : accent, 0.14),
                    }}
                  >
                    <Ionicons name={a.icon} size={17} color={a.destructive ? c.danger : accent} />
                  </View>
                  <Txt variant="title" color={a.destructive ? c.danger : c.text}>
                    {a.label}
                  </Txt>
                </Press>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

/* ─────────────────────────── Modal header ─────────────────────────── */

export function SheetHeader({
  kicker,
  title,
  onClose,
  right,
}: {
  kicker: string;
  title: string;
  onClose: () => void;
  right?: ReactNode;
}) {
  const { c, accent } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt variant="label" color={accent}>
          {kicker}
        </Txt>
        <Txt variant="h1" style={{ marginTop: 4 }}>
          {title}
        </Txt>
      </View>
      {right}
      <Press
        tapHaptic
        scaleTo={0.9}
        onPress={onClose}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          marginLeft: 8,
          backgroundColor: c.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={20} color={c.text} />
      </Press>
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <Txt variant="label" style={{ marginBottom: 10 }}>
      {children}
    </Txt>
  );
}
