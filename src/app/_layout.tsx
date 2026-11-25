import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue/400Regular';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FocusEngine } from '@/components/FocusEngine';
import { FxHost } from '@/components/FxHost';
import { PeekHost } from '@/components/TaskPeek';
import { startAuth, useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { startSync } from '@/store/sync';
import { useApplyAppearance, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
startAuth();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const dataReady = useData((s) => s.hydrated);
  const settingsReady = useSettings((s) => s.hydrated);
  const authReady = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const guest = useSettings((s) => s.guest);
  const theme = useTheme();
  useApplyAppearance();

  const ready = (fontsLoaded || !!fontError) && dataReady && settingsReady && authReady;

  useEffect(() => {
    if (dataReady && authReady) startSync();
  }, [dataReady, authReady]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.c.bg).catch(() => {});
  }, [theme.c.bg]);

  const navTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.accent,
        background: theme.c.bg,
        card: theme.c.bg,
        text: theme.c.text,
        border: theme.c.border,
        notification: theme.accent,
      },
    };
  }, [theme]);

  if (!ready) return null;

  const signedIn = !!session || guest;
  const sheet = { presentation: 'modal' as const, contentStyle: { backgroundColor: theme.c.bgElevated } };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.c.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.c.bg } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="task/[id]" options={sheet} />
            <Stack.Screen name="block/[id]" options={sheet} />
            <Stack.Screen name="goal/[id]" options={sheet} />
            <Stack.Screen name="note/[id]" options={sheet} />
            <Stack.Screen name="settings" options={sheet} />
            <Stack.Screen name="habit/[id]" options={sheet} />
            <Stack.Screen name="focus" options={sheet} />
            <Stack.Screen name="notes" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
        <FocusEngine />
        <PeekHost />
        <FxHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
