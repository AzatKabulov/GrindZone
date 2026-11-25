import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/pickers';
import { Heatmap } from '@/components/Heatmap';
import { Button, Card, Input, Press, Section, Txt, type IconName } from '@/components/ui';
import { isoToKey, fmtClock, relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import { useFocus } from '@/store/focus';
import { activeDays, activityByDay, bestStreak } from '@/store/selectors';
import { useSettings } from '@/store/settings';
import { signOut, syncNow, useSync } from '@/store/sync';
import { ACCENT_KEYS, ACCENTS, alpha, fonts, useTheme, type ThemeMode } from '@/theme';

export default function SettingsScreen() {
  const { c, accent, onAccent, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const session = useAuth((s) => s.session);
  const sync = useSync();
  const tasks = useData((s) => s.tasks);
  const blocks = useData((s) => s.blocks);
  const goals = useData((s) => s.goals);
  const notes = useData((s) => s.notes);
  const habits = useData((s) => s.habits);
  const focusHistory = useFocus((s) => s.history);
  const dirtyCount = useData((s) => Object.keys(s.dirty).length);
  const [name, setName] = useState(settings.name);

  const stats = useMemo(() => {
    const days = activeDays(tasks, goals, habits, focusHistory);
    return {
      tasks: Object.values(tasks).filter((t) => t.done).length,
      goals: Object.values(goals).filter((g) => g.status === 'achieved' && !g.deleted).length,
      focus: Object.values(focusHistory).reduce((a, b) => a + b, 0),
      best: bestStreak(days),
      activity: activityByDay({ tasks, blocks, notes, habits, goals, focus: focusHistory }),
    };
  }, [tasks, blocks, goals, notes, habits, focusHistory]);
  const initials = (settings.name || session?.user.email || 'G').trim().charAt(0).toUpperCase();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const doSignOut = () => {
    const run = async () => {
      haptic.warning();
      await signOut();
    };
    if (Platform.OS === 'web') return void run();
    Alert.alert(
      session ? 'Sign out?' : 'Leave offline mode?',
      session
        ? 'Your data is backed up to your account. It will be removed from this device until you sign in again.'
        : 'You will go back to the sign-in screen. Data stored on this device stays here until you sign in.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: session ? 'Sign out' : 'Continue', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const lastSync = sync.lastSyncedAt
    ? `${isoToKey(sync.lastSyncedAt) === todayKey() ? 'TODAY' : relativeLabel(isoToKey(sync.lastSyncedAt)!)} ${fmtClock(sync.lastSyncedAt)}`
    : 'NEVER';

  return (
    <View style={{ flex: 1, backgroundColor: c.bgElevated }}>
      <SheetHeader kicker="SETTINGS" title="PROFILE" onClose={close} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: insets.bottom + 40, gap: 26 }}>
        {/* Profile */}
        <Card style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                backgroundColor: accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 32, color: onAccent, marginTop: 4 }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h1" numberOfLines={1}>
                {(settings.name || 'YOUR NAME').toUpperCase()}
              </Txt>
              <Txt variant="label" numberOfLines={1} style={{ marginTop: 2 }}>
                {session?.user.email ?? 'OFFLINE MODE'}
              </Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, rowGap: 14 }}>
            <Stat label="TASKS DONE" value={stats.tasks} />
            <Stat label="BEST STREAK" value={`${stats.best}D`} />
            <Stat label="FOCUS SESSIONS" value={stats.focus} />
            <Stat label="GOALS ACHIEVED" value={stats.goals} />
          </View>
        </Card>

        <View>
          <Section label="LAST 6 MONTHS" style={{ marginBottom: 12 }} />
          <Card>
            <Heatmap counts={stats.activity} weeks={26} />
          </Card>
        </View>

        <View>
          <Section label="NAME" style={{ marginBottom: 12 }} />
          <Input
            value={name}
            onChangeText={setName}
            onEndEditing={() => settings.set({ name: name.trim() })}
            onBlur={() => settings.set({ name: name.trim() })}
            placeholder="Your name"
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        {/* Appearance */}
        <View>
          <Section label="APPEARANCE" style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.border }}>
            {(['system', 'dark', 'light'] as ThemeMode[]).map((m) => {
              const on = settings.mode === m;
              return (
                <Press
                  key={m}
                  tapHaptic
                  scaleTo={0.96}
                  onPress={() => settings.set({ mode: m })}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    backgroundColor: on ? c.surface : 'transparent',
                    borderWidth: on ? 1 : 0,
                    borderColor: c.borderStrong,
                  }}
                >
                  <Ionicons
                    name={m === 'system' ? 'phone-portrait-outline' : m === 'dark' ? 'moon' : 'sunny'}
                    size={14}
                    color={on ? accent : c.textDim}
                  />
                  <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: on ? c.text : c.textDim }}>
                    {m.toUpperCase()}
                  </Text>
                </Press>
              );
            })}
          </View>
          <Txt variant="label" style={{ marginTop: 18, marginBottom: 10 }}>
            ACCENT
          </Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {ACCENT_KEYS.map((k) => {
              const col = isDark ? ACCENTS[k].dark : ACCENTS[k].light;
              const on = settings.accent === k;
              return (
                <Press key={k} tapHaptic scaleTo={0.9} onPress={() => settings.set({ accent: k })} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: '100%',
                      aspectRatio: 1,
                      borderRadius: 14,
                      backgroundColor: col,
                      borderWidth: on ? 3 : 0,
                      borderColor: c.text,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on ? <Ionicons name="checkmark-sharp" size={20} color={isDark ? ACCENTS[k].onDark : ACCENTS[k].onLight} /> : null}
                  </View>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: on ? c.text : c.textFaint }}>
                    {ACCENTS[k].name}
                  </Text>
                </Press>
              );
            })}
          </View>
        </View>

        <View>
          <Row icon="pulse" title="Vibration" sub="A buzz when you finish something">
            <Switch
              value={settings.haptics}
              onValueChange={(v) => {
                settings.set({ haptics: v });
                if (v) haptic.success();
              }}
              trackColor={{ true: accent, false: c.surface3 }}
              thumbColor="#FFFFFF"
            />
          </Row>
        </View>

        {/* Sync */}
        <View>
          <Section label="ACCOUNT" style={{ marginBottom: 12 }} />
          {session ? (
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      sync.status === 'error' ? c.danger : sync.status === 'syncing' ? accent : sync.status === 'offline' ? c.textDim : c.success,
                  }}
                />
                <Txt variant="title" style={{ flex: 1 }}>
                  {sync.status === 'syncing'
                    ? 'Syncing…'
                    : sync.status === 'error'
                      ? 'Sync problem'
                      : sync.status === 'offline'
                        ? 'Offline — will sync later'
                        : 'Backed up to the cloud'}
                </Txt>
              </View>
              <Txt variant="small" color={c.textDim}>
                Last synced {lastSync.toLowerCase()}
                {dirtyCount ? ` · ${dirtyCount} waiting` : ''}
              </Txt>
              {sync.status === 'error' && sync.error ? (
                <Txt variant="small" color={c.danger}>
                  {sync.error}
                </Txt>
              ) : null}
              <Button label="SYNC NOW" icon="sync" variant="outline" small onPress={() => void syncNow()} />
            </Card>
          ) : (
            <Card style={{ gap: 12, borderColor: alpha(accent, 0.4) }}>
              <Txt variant="title">{"You're in offline mode"}</Txt>
              <Txt variant="small" color={c.textDim}>
                Data lives only on this phone. Create an account to back everything up and get it on any device — your
                current data comes with you.
              </Txt>
              <Button label="BACK UP MY DATA" icon="cloud-upload-outline" small onPress={() => settings.set({ guest: false })} />
            </Card>
          )}
        </View>

        <Button label={session ? 'SIGN OUT' : 'EXIT OFFLINE MODE'} icon="log-out-outline" variant="danger" onPress={doSignOut} />

        <Txt variant="label" color={c.textFaint} style={{ textAlign: 'center' }}>
          GRINDZONE v{Constants.expoConfig?.version ?? '1.0.0'}
        </Txt>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ width: '50%' }}>
      <Txt variant="h2">{value}</Txt>
      <Txt variant="label" style={{ fontSize: 9 }}>
        {label}
      </Txt>
    </View>
  );
}

function Row({
  icon,
  title,
  sub,
  children,
}: {
  icon: IconName;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  const { c, accent } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: 14,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: alpha(accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="title">{title}</Txt>
        {sub ? (
          <Txt variant="small" color={c.textDim}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {children}
    </View>
  );
}
