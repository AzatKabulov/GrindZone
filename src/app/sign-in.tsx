import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Segmented } from '@/components/fields';
import { Icon } from '@/components/Icon';
import { Button, InputRow, ListSection, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/store/settings';
import { alpha, squircle, useTheme } from '@/theme';

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'The email or password is incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first using the link we sent, then sign in.';
  if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists. Sign in instead.';
  if (/rate limit/i.test(msg)) return 'Too many attempts. Wait a minute and try again.';
  if (/network|fetch/i.test(msg)) return 'You’re offline. Check your connection or continue without an account.';
  return msg;
}

export default function SignInScreen() {
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const setSettings = useSettings((s) => s.set);
  const localName = useSettings((s) => s.name);

  const [mode, setMode] = useState(0); // 0 = sign in, 1 = create account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(localName);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 6;

  const submit = async () => {
    if (!valid || busy) {
      haptic.warning();
      if (password && password.length < 6) setError('Use at least 6 characters for your password.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 1) {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (e) throw e;
        if (name.trim()) setSettings({ name: name.trim() });
        if (!data.session) {
          haptic.success();
          setInfo('Account created. Open the confirmation email we sent, then sign in here.');
          setMode(0);
        } else {
          haptic.celebrate();
        }
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        const metaName = (data.user?.user_metadata?.name as string | undefined)?.trim();
        if (metaName && !useSettings.getState().name) setSettings({ name: metaName });
        haptic.success();
      }
    } catch (e) {
      haptic.warning();
      setError(friendly(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 20 }}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center' }}>
          <View style={{ borderRadius: 22, shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 12 } }}>
            <Image
              source={require('../../assets/icon.png')}
              style={[{ width: 96, height: 96, borderRadius: 22 }, squircle]}
              resizeMode="cover"
            />
          </View>
          <Txt variant="largeTitle" center style={{ marginTop: 22 }}>
            GrindZone
          </Txt>
          <Txt variant="body" color={c.label2} center style={{ marginTop: 6, maxWidth: 290 }}>
            Plan the day. Do the work. Stack the wins.
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(600)} style={{ marginTop: 36 }}>
          <Segmented
            values={['Sign In', 'Create Account']}
            index={mode}
            onChange={(i) => {
              setMode(i);
              setError(null);
            }}
          />

          <ListSection style={{ marginTop: 18 }}>
            {mode === 1 ? (
              <InputRow value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" textContentType="name" />
            ) : null}
            <InputRow
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <InputRow
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={mode === 1 ? 'newPassword' : 'password'}
                autoComplete={mode === 1 ? 'new-password' : 'current-password'}
                onSubmitEditing={submit}
                returnKeyType="go"
                style={{ flex: 1 }}
              />
              <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10} style={{ paddingHorizontal: 16 }}>
                <Icon name={showPw ? 'eyeSlash' : 'eye'} size={18} color={c.label2} />
              </Pressable>
            </View>
          </ListSection>

          {error ? (
            <Animated.View entering={FadeIn} style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginHorizontal: 6 }}>
              <Txt variant="footnote" color={c.red} style={{ flex: 1 }}>
                {error}
              </Txt>
            </Animated.View>
          ) : null}
          {info ? (
            <Animated.View
              entering={FadeIn}
              style={[{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: alpha(accent, 0.14) }, squircle]}
            >
              <Icon name="envelope" size={18} color={accent} />
              <Txt variant="subhead" style={{ flex: 1 }}>
                {info}
              </Txt>
            </Animated.View>
          ) : null}

          <Button
            label={busy ? 'Please Wait…' : mode === 0 ? 'Sign In' : 'Create Account'}
            onPress={submit}
            disabled={busy}
            style={{ marginTop: 22 }}
          />
        </Animated.View>

        <View style={{ flex: 1, minHeight: 24 }} />
        <Button label="Continue Without an Account" variant="plain" color={c.label2} onPress={() => setSettings({ guest: true })} />
        <Txt variant="caption" color={c.label2} center style={{ marginTop: 6, marginHorizontal: 30 }}>
          An account backs up your tasks, plans, goals and notes, and keeps them in sync on every device.
        </Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
