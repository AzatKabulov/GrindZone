import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader/500Medium_Italic';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PickerHost } from '@/components/fields';
import { FxHost } from '@/components/FxHost';
import { useStackOptions } from '@/components/header';
import { startAuth, useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { startSync } from '@/store/sync';
import { useApplyAppearance, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
startAuth();

// iOS uses Apple's system fonts (SF Pro, SF Pro Rounded, New York). Other platforms get close stand-ins.
const WEB_FONTS =
  Platform.OS === 'ios'
    ? {}
    : {
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Newsreader_500Medium,
        Newsreader_600SemiBold,
        Newsreader_400Regular_Italic,
        Newsreader_500Medium_Italic,
      };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(WEB_FONTS);
  const dataReady = useData((s) => s.hydrated);
  const settingsReady = useSettings((s) => s.hydrated);
  const authReady = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const guest = useSettings((s) => s.guest);
  const theme = useTheme();
  const sheet = useStackOptions(false);
  useApplyAppearance();

  const ready = (Platform.OS === 'ios' || fontsLoaded || !!fontError) && dataReady && settingsReady && authReady;

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
        text: theme.c.label,
        border: theme.c.separator,
        notification: theme.c.red,
      },
    };
  }, [theme]);

  if (!ready) return null;

  const signedIn = !!session || guest;
  const modal = { ...sheet, presentation: 'modal' as const, headerShown: true };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.c.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.c.bg } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="task/[id]" options={modal} />
            <Stack.Screen name="block/[id]" options={modal} />
            <Stack.Screen name="settings" options={{ ...modal, title: 'Profile' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
        <FxHost />
        <PickerHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
