import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { font, useTheme } from '@/theme';
import { Icon, sfName, type IconName } from './Icon';
import { pick } from './fields';
import { Txt } from './ui';

export interface MenuItem {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
}

export interface HeaderAction {
  key: string;
  label: string;
  icon?: IconName;
  onPress?: () => void;
  /** `done` renders the iOS prominent confirmation style. */
  variant?: 'plain' | 'done' | 'prominent';
  disabled?: boolean;
  menu?: MenuItem[];
}

/**
 * Native navigation-bar buttons (UIBarButtonItem + SF Symbols + UIMenu) via Stack.Toolbar on iOS,
 * with a plain fallback on web so the preview stays usable.
 */
export function HeaderActions({ left, right }: { left?: HeaderAction[]; right?: HeaderAction[] }) {
  if (Platform.OS !== 'web') {
    return (
      <>
        {left?.length ? <Stack.Toolbar placement="left">{left.map(renderNative)}</Stack.Toolbar> : null}
        {right?.length ? <Stack.Toolbar placement="right">{right.map(renderNative)}</Stack.Toolbar> : null}
      </>
    );
  }
  return (
    <Stack.Screen
      options={{
        headerLeft: left?.length ? () => <WebButtons items={left} /> : undefined,
        headerRight: right?.length ? () => <WebButtons items={right} /> : undefined,
      }}
    />
  );
}

function renderNative(a: HeaderAction) {
  if (a.menu) {
    return (
      <Stack.Toolbar.Menu key={a.key} icon={a.icon ? sfName(a.icon) : undefined} title={a.label}>
        {a.menu.map((m) => (
          <Stack.Toolbar.MenuAction
            key={m.label}
            icon={m.icon ? sfName(m.icon) : undefined}
            destructive={m.destructive}
            onPress={m.onPress}
          >
            {m.label}
          </Stack.Toolbar.MenuAction>
        ))}
      </Stack.Toolbar.Menu>
    );
  }
  return (
    <Stack.Toolbar.Button
      key={a.key}
      icon={a.icon ? sfName(a.icon) : undefined}
      variant={a.variant ?? 'plain'}
      disabled={a.disabled}
      onPress={a.onPress}
    >
      {a.label}
    </Stack.Toolbar.Button>
  );
}

function WebButtons({ items }: { items: HeaderAction[] }) {
  const { accent } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 18, paddingHorizontal: 16 }}>
      {items.map((a) => (
        <Pressable
          key={a.key}
          disabled={a.disabled}
          onPress={() => (a.menu ? pick(a.label, a.menu) : a.onPress?.())}
          style={{ opacity: a.disabled ? 0.35 : 1 }}
        >
          {a.icon ? (
            <Icon name={a.icon} size={22} color={accent} />
          ) : (
            <Txt variant="body" weight={a.variant === 'done' ? '600' : '400'} color={accent}>
              {a.label}
            </Txt>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/** Shared native-stack look: large titles, no hairline, Liquid Glass bar on iOS 26. */
export function useStackOptions(largeTitle = true, opaque = false): NativeStackNavigationOptions {
  const { c, accent } = useTheme();
  return useMemo(
    () => ({
      headerLargeTitleEnabled: largeTitle,
      headerShadowVisible: false,
      headerLargeTitleShadowVisible: false,
      headerTransparent: opaque ? false : undefined,
      headerStyle: Platform.OS === 'ios' && !opaque ? undefined : { backgroundColor: c.bg },
      headerTitleStyle: { color: c.label, fontFamily: font('600').fontFamily, fontWeight: '600' },
      headerLargeTitleStyle: { color: c.label, fontFamily: font('700').fontFamily, fontWeight: '700' },
      headerTintColor: accent,
      headerBackButtonDisplayMode: 'minimal',
      contentStyle: { backgroundColor: c.bg },
    }),
    [c, accent, largeTitle, opaque],
  );
}
