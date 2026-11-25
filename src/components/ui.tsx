import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { alpha, fonts, radius, useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* ───────────────────────────── Text ───────────────────────────── */

type Variant =
  | 'hero'
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'small'
  | 'label'
  | 'mono';

const VARIANTS: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 62, lineHeight: 60, letterSpacing: 0.5 },
  display: { fontFamily: fonts.display, fontSize: 42, lineHeight: 42, letterSpacing: 0.5 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 33, letterSpacing: 0.6 },
  h2: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, letterSpacing: 0.8 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.6 },
  mono: { fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 17, letterSpacing: 0.4 },
};

export function Txt({
  variant = 'body',
  color,
  size,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string; size?: number }) {
  const { c } = useTheme();
  const base = VARIANTS[variant];
  const dim = variant === 'label';
  return (
    <Text
      {...rest}
      style={[
        base,
        { color: color ?? (dim ? c.textDim : c.text) },
        size ? { fontSize: size, lineHeight: Math.round(size * (base.fontFamily === fonts.display ? 1 : 1.35)) } : null,
        style,
      ]}
    />
  );
}

/* ─────────────────────────── Pressable ─────────────────────────── */

const APressable = Animated.createAnimatedComponent(Pressable);

export function Press({
  scaleTo = 0.96,
  tapHaptic = false,
  onPress,
  style,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  scaleTo?: number;
  tapHaptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        s.set(withTiming(scaleTo, { duration: 90 }));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, { damping: 14, stiffness: 320 }));
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (tapHaptic) haptic.tap();
        onPress?.(e);
      }}
      style={[style, a]}
    >
      {children}
    </APressable>
  );
}

/* ──────────────────────────── Button ──────────────────────────── */

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  small,
  style,
  color,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  const { c, accent, onAccent } = useTheme();
  const fill = color ?? accent;
  const fg =
    variant === 'primary'
      ? onAccent
      : variant === 'danger'
        ? c.danger
        : variant === 'ghost'
          ? c.textDim
          : c.text;
  return (
    <Press
      disabled={disabled}
      tapHaptic
      onPress={onPress}
      style={[
        {
          height: small ? 40 : 54,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? radius.sm : 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.4 : 1,
        },
        variant === 'primary' && { backgroundColor: fill },
        variant === 'outline' && { borderWidth: 1, borderColor: c.borderStrong },
        variant === 'danger' && { borderWidth: 1, borderColor: alpha(c.danger, 0.35) },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: small ? 17 : 21,
          letterSpacing: 1.4,
          color: fg,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </Press>
  );
}

/* ───────────────────────────── Card ───────────────────────────── */

export function Card({ style, children, ...rest }: ViewProps) {
  const { c } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.md + 2,
          borderWidth: 1,
          borderColor: c.border,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ───────────────────────────── Chip ───────────────────────────── */

export function Chip({
  label,
  active,
  onPress,
  color,
  icon,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Tinted style in this colour instead of the solid accent. */
  color?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, accent, onAccent } = useTheme();
  const tint = color;
  const bg = active ? (tint ? alpha(tint, 0.16) : accent) : c.surface2;
  const border = active ? (tint ?? accent) : c.border;
  const fg = active ? (tint ?? onAccent) : c.textDim;
  return (
    <Press
      tapHaptic
      onPress={onPress}
      style={[
        {
          height: 34,
          paddingHorizontal: 12,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: fg }}>
        {label}
      </Text>
    </Press>
  );
}

/* ─────────────────────────── IconButton ─────────────────────────── */

export function IconBtn({
  icon,
  onPress,
  accentFill,
  size = 40,
  color,
  style,
  disabled,
}: {
  icon: IconName;
  onPress?: () => void;
  accentFill?: boolean;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const { c, accent, onAccent } = useTheme();
  return (
    <Press
      tapHaptic
      scaleTo={0.9}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[
        {
          opacity: disabled ? 0.35 : 1,
          width: size,
          height: size,
          borderRadius: size * 0.32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accentFill ? accent : c.surface2,
          borderWidth: accentFill ? 0 : 1,
          borderColor: c.border,
        },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={size * 0.5}
        color={color ?? (accentFill ? onAccent : c.text)}
      />
    </Press>
  );
}

/* ─────────────────────────── Section header ─────────────────────────── */

export function Section({
  label,
  count,
  action,
  onAction,
  style,
}: {
  label: string;
  count?: number | string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, accent } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <Txt variant="label" color={c.text}>
        {label}
      </Txt>
      {count !== undefined ? (
        <Txt variant="label" color={c.textFaint}>
          {String(count).padStart(2, '0')}
        </Txt>
      ) : null}
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      {action ? (
        <Press onPress={onAction} tapHaptic hitSlop={10}>
          <Txt variant="label" color={accent}>
            {action}
          </Txt>
        </Press>
      ) : null}
    </View>
  );
}

/* ───────────────────────────── Input ───────────────────────────── */

export function Input({ style, ...rest }: TextInputProps) {
  const { c, accent, isDark } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textFaint}
      selectionColor={accent}
      keyboardAppearance={isDark ? 'dark' : 'light'}
      {...rest}
      style={[
        {
          backgroundColor: c.surface2,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontFamily: fonts.body,
          fontSize: 16,
          color: c.text,
        },
        style,
      ]}
    />
  );
}

/* ─────────────────────────── Progress bar ─────────────────────────── */

export function ProgressBar({
  value,
  color,
  height = 6,
  track,
  style,
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, accent } = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 700 });
  }, [value, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: track ?? c.surface3,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color ?? accent }, a]}
      />
    </View>
  );
}

/* ───────────────────────────── Screen ───────────────────────────── */

/** Space to leave at the bottom of tab screens so content clears the floating tab bar. */
export const TAB_BAR_SPACE = 110;

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }, style]}>{children}</View>
  );
}

/** Big title row used at the top of every tab. */
export function ScreenTitle({
  kicker,
  title,
  middle,
  right,
}: {
  kicker?: string;
  title: string;
  /** Shown right after the title (e.g. a progress ring). */
  middle?: ReactNode;
  right?: ReactNode;
}) {
  const { accent } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: 10, marginBottom: 18 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <View>
          {kicker ? <Txt variant="label">{kicker}</Txt> : null}
          <Txt variant="display" style={{ marginTop: 6 }}>
            {title}
            <Text style={{ color: accent }}>.</Text>
          </Txt>
        </View>
        {middle}
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>{right}</View> : null}
    </View>
  );
}

/* ───────────────────────────── Empty ───────────────────────────── */

export function Empty({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  text?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, gap: 10 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={24} color={c.textFaint} />
      </View>
      <Txt variant="h2" style={{ marginTop: 6 }}>
        {title}
      </Txt>
      {text ? (
        <Txt variant="small" color={c.textDim} style={{ textAlign: 'center', maxWidth: 260 }}>
          {text}
        </Txt>
      ) : null}
      {action ? (
        <Button label={action} small variant="outline" onPress={onAction} style={{ marginTop: 8 }} />
      ) : null}
    </View>
  );
}

export const hairline = StyleSheet.hairlineWidth;
