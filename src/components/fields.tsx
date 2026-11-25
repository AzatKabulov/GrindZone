import DateTimePicker from '@react-native-community/datetimepicker';
import NativeSegmented from '@react-native-segmented-control/segmented-control';
import { useState, type ComponentType, type ReactNode } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { addDays, dateKey, dateToMin, fmtMin, minToDate, monthLong, parseKey, relativeLabel, shortDate, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { squircle, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Press, Txt } from './ui';

const isIOS = Platform.OS === 'ios';

// The package ships a class-component typing that React 19's JSX types reject; describe what we use.
const SegmentedControl = NativeSegmented as unknown as ComponentType<{
  values: string[];
  selectedIndex: number;
  appearance?: 'dark' | 'light';
  onChange: (e: { nativeEvent: { selectedSegmentIndex: number } }) => void;
  style?: StyleProp<ViewStyle>;
}>;

/* ─────────────────────────── Segmented control ─────────────────────────── */

export function Segmented({
  values,
  index,
  onChange,
}: {
  values: string[];
  index: number;
  onChange: (i: number) => void;
}) {
  const { isDark, c } = useTheme();
  if (isIOS) {
    return (
      <SegmentedControl
        values={values}
        selectedIndex={index}
        appearance={isDark ? 'dark' : 'light'}
        onChange={(e) => {
          haptic.tap();
          onChange(e.nativeEvent.selectedSegmentIndex);
        }}
        style={{ height: 32 }}
      />
    );
  }
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: c.fill2, borderRadius: 9, padding: 2 }, squircle]}>
      {values.map((v, i) => (
        <Pressable
          key={v}
          onPress={() => onChange(i)}
          style={{
            flex: 1,
            height: 28,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: i === index ? (isDark ? '#636366' : '#FFFFFF') : 'transparent',
          }}
        >
          <Txt variant="footnote" weight={i === index ? '600' : '500'}>
            {v}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

/* ─────────────────────────── Date & time ─────────────────────────── */

/** Native compact date picker on iOS (the little capsule that opens a calendar). */
export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { accent, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  if (isIOS) {
    return (
      <DateTimePicker
        value={parseKey(value)}
        mode="date"
        display="compact"
        accentColor={accent}
        themeVariant={isDark ? 'dark' : 'light'}
        onValueChange={(_, d) => onChange(dateKey(d))}
      />
    );
  }
  return (
    <>
      <Chip label={shortDate(value)} onPress={() => setOpen((o) => !o)} />
      {open ? (
        <WebSheet onClose={() => setOpen(false)}>
          <MiniCalendar
            value={value}
            onChange={(v) => {
              onChange(v);
              setOpen(false);
            }}
          />
        </WebSheet>
      ) : null}
    </>
  );
}

/** Native compact time picker on iOS; minute steps of 5. */
export function TimeField({
  day,
  value,
  onChange,
}: {
  day: string;
  value: number;
  onChange: (min: number) => void;
}) {
  const { accent, isDark } = useTheme();
  if (isIOS) {
    return (
      <DateTimePicker
        value={minToDate(day, value)}
        mode="time"
        display="compact"
        minuteInterval={5}
        locale="en_GB"
        accentColor={accent}
        themeVariant={isDark ? 'dark' : 'light'}
        onValueChange={(_, d) => onChange(dateToMin(d))}
      />
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Chip label="−" onPress={() => onChange(Math.max(0, value - 15))} />
      <Chip label={fmtMin(value)} />
      <Chip label="+" onPress={() => onChange(Math.min(1440, value + 15))} />
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} style={[{ paddingHorizontal: 11, height: 34, borderRadius: 8, backgroundColor: c.fill2, justifyContent: 'center' }, squircle]}>
      <Txt variant="body" tabular>
        {label}
      </Txt>
    </Press>
  );
}

/** Quick date choices shown under a date toggle. */
export function QuickDates({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c, accent } = useTheme();
  const today = todayKey();
  const opts = [
    { label: 'Today', v: today },
    { label: 'Tomorrow', v: addDays(today, 1) },
    { label: 'Next Week', v: addDays(today, 7) },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {opts.map((o) => {
        const on = o.v === value;
        return (
          <Press
            key={o.label}
            tapHaptic
            onPress={() => onChange(o.v)}
            style={[
              {
                paddingHorizontal: 12,
                height: 30,
                borderRadius: 15,
                justifyContent: 'center',
                backgroundColor: on ? accent : c.fill2,
              },
            ]}
          >
            <Txt variant="footnote" weight="600" color={on ? '#FFFFFF' : c.label}>
              {o.label}
            </Txt>
          </Press>
        );
      })}
    </View>
  );
}

export function MiniCalendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c, accent } = useTheme();
  const today = todayKey();
  const base = parseKey(value);
  const [cursor, setCursor] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const lead = (cursor.getDay() + 6) % 7;
  const daysIn = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
  while (cells.length % 7) cells.push(null);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Txt variant="headline" style={{ flex: 1 }}>
          {monthLong(cursor)} {cursor.getFullYear()}
        </Txt>
        <Pressable hitSlop={10} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={{ padding: 6 }}>
          <Icon name="chevronLeft" size={17} color={accent} weight="semibold" />
        </Pressable>
        <Pressable hitSlop={10} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={{ padding: 6 }}>
          <Icon name="chevronRight" size={17} color={accent} weight="semibold" />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
          <View key={d} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 6 }}>
            <Txt variant="caption2" weight="600" color={c.label3}>
              {d}
            </Txt>
          </View>
        ))}
        {cells.map((k, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
            {k ? (
              <Pressable
                onPress={() => onChange(k)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: k === value ? accent : 'transparent',
                }}
              >
                <Txt variant="body" weight={k === value || k === today ? '600' : '400'} color={k === value ? '#FFFFFF' : k === today ? accent : c.label}>
                  {Number(k.slice(8))}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─────────────────────────── Option picker ─────────────────────────── */

export interface PickOption {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

const useWebPicker = create<{ title?: string; options: PickOption[] | null }>(() => ({ options: null }));

/** Native iOS action sheet; a matching bottom sheet on other platforms. */
export function pick(title: string | undefined, options: PickOption[]) {
  if (isIOS) {
    const labels = [...options.map((o) => o.label), 'Cancel'];
    const destructiveButtonIndex = options.findIndex((o) => o.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (i) => {
        if (i < options.length) options[i].onPress();
      },
    );
    return;
  }
  useWebPicker.setState({ title, options });
}

/** Mount once at the root; renders `pick()` sheets on non-iOS platforms. */
export function PickerHost() {
  const { title, options } = useWebPicker();
  const { c, accent } = useTheme();
  if (isIOS || !options) return null;
  const close = () => useWebPicker.setState({ options: null });
  return (
    <WebSheet onClose={close}>
      {title ? (
        <Txt variant="footnote" color={c.label2} center style={{ marginBottom: 10 }}>
          {title}
        </Txt>
      ) : null}
      {options.map((o) => (
        <Pressable
          key={o.label}
          onPress={() => {
            close();
            o.onPress();
          }}
          style={{ paddingVertical: 14, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }}
        >
          <Txt variant="body" color={o.destructive ? c.red : accent}>
            {o.label}
          </Txt>
        </Pressable>
      ))}
    </WebSheet>
  );
}

function WebSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
          <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(160)}
          style={[
            { backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 20 },
            squircle,
          ]}
        >
          <ScrollView bounces={false} style={{ maxHeight: 520 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export const dateLabel = (v: string | null) => (v ? relativeLabel(v) : 'None');
