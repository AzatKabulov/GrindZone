import { LinearGradient } from 'expo-linear-gradient';
import { Children, isValidElement, useEffect, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ScrollViewProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { alpha, font, squircle, TYPE, useTheme, type Design, type TextVariant, type Weight } from '@/theme';
import { Icon, type IconName } from './Icon';

export type { IconName };

/* ───────────────────────────── Text ───────────────────────────── */

export function Txt({
  variant = 'body',
  weight,
  design = 'default',
  italic,
  color,
  size,
  tabular,
  center,
  style,
  ...rest
}: TextProps & {
  variant?: TextVariant;
  weight?: Weight;
  design?: Design;
  italic?: boolean;
  color?: string;
  size?: number;
  tabular?: boolean;
  center?: boolean;
}) {
  const { c } = useTheme();
  const t = TYPE[variant];
  const fs = size ?? t.size;
  const st: TextStyle = {
    ...font(weight ?? t.weight, design, italic),
    fontSize: fs,
    lineHeight: size ? Math.round(size * 1.2) : t.line,
    letterSpacing: design === 'serif' ? 0 : size ? undefined : t.tracking,
    color: color ?? c.label,
    ...(tabular ? { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] } : null),
    ...(center ? { textAlign: 'center' as const } : null),
  };
  return <Text {...rest} style={[st, style]} />;
}

/* ─────────────────────────── Pressable ─────────────────────────── */

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with Apple-style feedback: a gentle scale + dim. */
export function Press({
  scaleTo = 0.97,
  dim = true,
  tapHaptic = false,
  onPress,
  style,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  scaleTo?: number;
  dim?: boolean;
  tapHaptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * p.value }],
    opacity: dim ? 1 - 0.25 * p.value : 1,
  }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        p.set(withTiming(1, { duration: 80 }));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.set(withSpring(0, { damping: 16, stiffness: 260 }));
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
  variant = 'filled',
  size = 'large',
  icon,
  disabled,
  color,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';
  size?: 'large' | 'medium' | 'small';
  icon?: IconName;
  disabled?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, accent } = useTheme();
  const tint = color ?? accent;
  const h = size === 'large' ? 52 : size === 'medium' ? 42 : 32;
  const bg =
    variant === 'filled'
      ? tint
      : variant === 'tinted'
        ? alpha(tint, 0.16)
        : variant === 'gray'
          ? c.fill2
          : variant === 'destructive'
            ? alpha(c.red, 0.14)
            : 'transparent';
  const fg = variant === 'filled' ? '#FFFFFF' : variant === 'destructive' ? c.red : variant === 'gray' ? c.label : tint;
  return (
    <Press
      disabled={disabled}
      tapHaptic
      scaleTo={0.96}
      onPress={onPress}
      style={[
        {
          height: h,
          paddingHorizontal: size === 'small' ? 14 : 20,
          borderRadius: h / 2,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'small' ? 13 : 17} color={fg} weight="semibold" /> : null}
      <Txt variant={size === 'small' ? 'subhead' : 'headline'} weight="600" color={fg}>
        {label}
      </Txt>
    </Press>
  );
}

/* ───────────────────────────── Card ───────────────────────────── */

export function Card({ style, children, ...rest }: ViewProps) {
  const { c } = useTheme();
  return (
    <View
      {...rest}
      style={[{ backgroundColor: c.card, borderRadius: 22, padding: 16, overflow: 'hidden' }, squircle, style]}
    >
      {children}
    </View>
  );
}

/* ─────────────────────────── Grouped list ─────────────────────────── */

export function SectionHeader({
  title,
  detail,
  action,
  onAction,
  color,
  style,
}: {
  title: string;
  detail?: string;
  action?: string;
  onAction?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, accent } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 4, marginBottom: 8 }, style]}>
      <Txt variant="title3" weight="700" color={color} style={{ flex: 1 }}>
        {title}
        {detail ? (
          <Txt variant="title3" weight="400" color={c.label2}>
            {'  '}
            {detail}
          </Txt>
        ) : null}
      </Txt>
      {action ? (
        <Press onPress={onAction} hitSlop={10} tapHaptic>
          <Txt variant="body" color={accent}>
            {action}
          </Txt>
        </Press>
      ) : null}
    </View>
  );
}

/** Inset grouped list section (Settings / Reminders style). Separators are inserted between rows. */
export function ListSection({
  header,
  footer,
  inset = 16,
  children,
  style,
}: {
  header?: string;
  footer?: string;
  inset?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={style}>
      {header ? (
        <Txt variant="footnote" color={c.label2} style={{ textTransform: 'uppercase', marginLeft: 16, marginBottom: 7 }}>
          {header}
        </Txt>
      ) : null}
      <View style={[{ backgroundColor: c.card, borderRadius: 22, overflow: 'hidden' }, squircle]}>
        {rows.map((row, i) => (
          <View key={row.key ?? i}>
            {row}
            {i < rows.length - 1 ? (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginLeft: inset }} />
            ) : null}
          </View>
        ))}
      </View>
      {footer ? (
        <Txt variant="footnote" color={c.label2} style={{ marginHorizontal: 16, marginTop: 7 }}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

/** Coloured rounded-square glyph, like the icons in iOS Settings. */
export function IconTile({ name, color, size = 30 }: { name: IconName; color: string; size?: number }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.24,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        },
        squircle,
      ]}
    >
      <Icon name={name} size={size * 0.56} color="#FFFFFF" weight="semibold" />
    </View>
  );
}

export function Row({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  valueColor,
  chevron,
  onPress,
  right,
  titleColor,
  center,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  chevron?: boolean;
  onPress?: () => void;
  right?: ReactNode;
  titleColor?: string;
  center?: boolean;
}) {
  const { c, accent } = useTheme();
  const content = (
    <View
      style={{
        minHeight: subtitle ? 58 : 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 14,
      }}
    >
      {icon ? <IconTile name={icon} color={iconColor ?? accent} /> : null}
      <View style={{ flex: 1, alignItems: center ? 'center' : 'flex-start' }}>
        <Txt variant="body" color={titleColor ?? c.label} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="footnote" color={c.label2} numberOfLines={2} style={{ marginTop: 1 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt variant="body" color={valueColor ?? c.label2} numberOfLines={1} style={{ maxWidth: '55%' }}>
          {value}
        </Txt>
      ) : null}
      {right}
      {chevron ? <Icon name="chevronRight" size={13} color={c.label3} weight="semibold" /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? c.fill2 : 'transparent' })}>
      {content}
    </Pressable>
  );
}

/** Borderless text field that sits inside a ListSection, like iOS forms. */
export function InputRow({ style, multiline, ...rest }: TextInputProps) {
  const { c, accent, isDark } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.label3}
      selectionColor={accent}
      keyboardAppearance={isDark ? 'dark' : 'light'}
      multiline={multiline}
      {...rest}
      style={[
        {
          ...font('400'),
          fontSize: 17,
          lineHeight: multiline ? 22 : undefined,
          color: c.label,
          paddingHorizontal: 16,
          paddingVertical: 13,
          minHeight: multiline ? 96 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
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
    w.set(withTiming(Math.max(0, Math.min(1, value)), { duration: 700 }));
  }, [value, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track ?? c.fill, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color ?? accent }, a]} />
    </View>
  );
}

/* ───────────────────────────── Screen ───────────────────────────── */

/** Bottom space so content clears the tab bar on platforms that don't inset automatically. */
export const BOTTOM_SPACE = Platform.OS === 'ios' ? 32 : 110;

/** Scroll container that cooperates with native large titles and the tab bar. */
export function ScrollScreen({ children, contentContainerStyle, ...rest }: ScrollViewProps & { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      {...rest}
      style={[{ flex: 1, backgroundColor: c.bg }, rest.style]}
      contentContainerStyle={[{ paddingHorizontal: 16, paddingBottom: BOTTOM_SPACE }, contentContainerStyle]}
    >
      {children}
    </ScrollView>
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
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 }}>
      <Icon name={icon} size={46} color={c.label3} weight="light" />
      <Txt variant="title2" center style={{ marginTop: 10 }}>
        {title}
      </Txt>
      {text ? (
        <Txt variant="subhead" color={c.label2} center style={{ maxWidth: 290 }}>
          {text}
        </Txt>
      ) : null}
      {action ? <Button label={action} size="medium" variant="tinted" onPress={onAction} style={{ marginTop: 12 }} /> : null}
    </View>
  );
}

/* ───────────────────────────── Avatar ───────────────────────────── */

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const { accent } = useTheme();
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'G';
  return (
    <LinearGradient
      colors={[alpha(accent, 0.75), accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Txt design="rounded" weight="600" size={size * 0.42} color="#FFFFFF">
        {initials}
      </Txt>
    </LinearGradient>
  );
}

export const hairline = StyleSheet.hairlineWidth;
