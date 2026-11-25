import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input, Press, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/store/settings';
import { alpha, fonts, useTheme } from '@/theme';

type Mode = 'signin' | 'signup';

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first — check your inbox for the link, then sign in.';
  if (/already registered|already exists/i.test(msg)) return 'This email already has an account. Sign in instead.';
  if (/rate limit/i.test(msg)) return 'Too many attempts. Wait a minute and try again.';
  if (/network|fetch/i.test(msg)) return 'No connection. Check your internet, or continue offline.';
  return msg;
}

export default function SignInScreen() {
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const setSettings = useSettings((s) => s.set);
  const localName = useSettings((s) => s.name);

  const [mode, setMode] = useState<Mode>('signin');
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
      if (password && password.length < 6) setError('Password needs at least 6 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (e) throw e;
        if (name.trim()) setSettings({ name: name.trim() });
        if (!data.session) {
          haptic.success();
          setInfo('Account created. Confirm your email via the link we sent, then sign in here.');
          setMode('signin');
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient
        colors={[alpha(accent, 0.26), alpha(accent, 0.05), alpha(accent, 0)]}
        locations={[0, 0.35, 0.7]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520 }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(600)}>
            <Txt variant="label" color={accent}>
              {'// DISCIPLINE OPERATING SYSTEM'}
            </Txt>
            <Text style={{ fontFamily: fonts.display, fontSize: 116, lineHeight: 104, color: c.text, marginTop: 18, letterSpacing: 1 }}>
              GRIND
            </Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 116, lineHeight: 104, color: accent, letterSpacing: 1 }}>
              ZONE<Text style={{ color: c.text }}>.</Text>
            </Text>
            <Txt variant="body" color={c.textDim} style={{ marginTop: 14, maxWidth: 300 }}>
              Plan the day. Get it done. Stack the wins.
            </Txt>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(600)} style={{ marginTop: 36, gap: 14 }}>
            <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.border }}>
              {(['signin', 'signup'] as Mode[]).map((m) => {
                const on = mode === m;
                return (
                  <Press
                    key={m}
                    tapHaptic
                    scaleTo={0.97}
                    onPress={() => {
                      setMode(m);
                      setError(null);
                    }}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 9,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? c.surface3 : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4, color: on ? c.text : c.textDim }}>
                      {m === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                    </Text>
                  </Press>
                );
              })}
            </View>

            {mode === 'signup' ? (
              <Animated.View entering={FadeIn.duration(200)}>
                <Txt variant="label" style={{ marginBottom: 8 }}>
                  NAME
                </Txt>
                <Input value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" textContentType="nickname" />
              </Animated.View>
            ) : null}

            <View>
              <Txt variant="label" style={{ marginBottom: 8 }}>
                EMAIL
              </Txt>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
            <View>
              <Txt variant="label" style={{ marginBottom: 8 }}>
                PASSWORD
              </Txt>
              <View>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                  style={{ paddingRight: 48 }}
                />
                <Press
                  onPress={() => setShowPw((v) => !v)}
                  hitSlop={8}
                  style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={c.textFaint} />
                </Press>
              </View>
            </View>

            {error ? (
              <Animated.View entering={FadeIn} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Ionicons name="alert-circle" size={16} color={c.danger} style={{ marginTop: 1 }} />
                <Txt variant="small" color={c.danger} style={{ flex: 1 }}>
                  {error}
                </Txt>
              </Animated.View>
            ) : null}
            {info ? (
              <Animated.View
                entering={FadeIn}
                style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: alpha(accent, 0.1), borderWidth: 1, borderColor: alpha(accent, 0.3) }}
              >
                <Ionicons name="mail-unread-outline" size={18} color={accent} />
                <Txt variant="small" style={{ flex: 1 }}>
                  {info}
                </Txt>
              </Animated.View>
            ) : null}

            <Button
              label={busy ? 'STAND BY…' : mode === 'signin' ? 'ENTER THE ZONE' : 'ENLIST'}
              icon={mode === 'signin' ? 'flash' : 'shield-checkmark'}
              onPress={submit}
              disabled={busy}
              style={{ marginTop: 6 }}
            />
          </Animated.View>

          <View style={{ flex: 1, minHeight: 28 }} />
          <Press onPress={() => setSettings({ guest: true })} tapHaptic style={{ alignSelf: 'center', paddingVertical: 10 }}>
            <Txt variant="label" color={c.textDim}>
              CONTINUE OFFLINE →
            </Txt>
          </Press>
          <Txt variant="label" color={c.textFaint} style={{ textAlign: 'center', marginTop: 6, fontSize: 9 }}>
            ACCOUNT = CLOUD BACKUP + ACCESS FROM ANY DEVICE
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
