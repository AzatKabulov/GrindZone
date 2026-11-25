import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/Icon';
import { font, useTheme } from '@/theme';

/** Web preview only: an iOS-looking bottom tab bar (iPhone uses the native one in _layout.tsx). */
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: '(today)', title: 'Today', icon: 'today' },
  { name: 'tasks', title: 'Tasks', icon: 'tasks' },
  { name: 'plan', title: 'Plan', icon: 'plan' },
  { name: 'goals', title: 'Goals', icon: 'goals' },
  { name: 'notes', title: 'Notes', icon: 'notes' },
];

export default function WebTabsLayout() {
  const { c, accent, isDark } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: c.label2,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(22,22,24,0.94)' : 'rgba(249,249,249,0.94)',
          borderTopColor: c.separator,
          height: 84,
          paddingTop: 6,
        },
        tabBarLabelStyle: { ...font('500'), fontSize: 10 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color }) => <Icon name={t.icon} size={24} color={String(color)} /> }}
        />
      ))}
    </Tabs>
  );
}
