import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Switch, View } from 'react-native';

import { Segmented } from '@/components/fields';
import { HeaderActions } from '@/components/header';
import { Icon, type IconName } from '@/components/Icon';
import { Avatar, Card, InputRow, ListSection, ProgressBar, Row, ScrollScreen, Txt } from '@/components/ui';
import { fmtClock, isoToKey, relativeLabel, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { fmtNum, levelInfo } from '@/lib/xp';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import { activeDays, bestStreak, currentStreak, totalXp } from '@/store/selectors';
import { useSettings } from '@/store/settings';
import { signOut, syncNow, useSync } from '@/store/sync';
import { ACCENT_KEYS, ACCENTS, useTheme, type ThemeMode } from '@/theme';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { c, accent, isDark } = useTheme();
  const settings = useSettings();
  const session = useAuth((s) => s.session);
  const sync = useSync();
  const tasks = useData((s) => s.tasks);
  const blocks = useData((s) => s.blocks);
  const goals = useData((s) => s.goals);
  const pending = useData((s) => Object.keys(s.dirty).length);
  const [name, setName] = useState(settings.name);

  const stats = useMemo(() => {
    const days = activeDays(tasks, blocks, goals);
    return {
      xp: totalXp(tasks, blocks, goals),
      tasks: Object.values(tasks).filter((t) => t.done).length,
      blocks: Object.values(blocks).filter((b) => b.done).length,
      goals: Object.values(goals).filter((g) => g.status === 'achieved' && !g.deleted).length,
      streak: currentStreak(days, todayKey()),
      best: bestStreak(days),
    };
  }, [tasks, blocks, goals]);
  const lvl = levelInfo(stats.xp);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const saveName = () => settings.set({ name: name.trim() });

  const doSignOut = () => {
    const run = async () => {
      haptic.warning();
      await signOut();
    };
    if (Platform.OS === 'web') return void run();
    Alert.alert(
      session ? 'Sign Out?' : 'Leave Offline Mode?',
      session
        ? 'Everything is backed up to your account and will be removed from this iPhone until you sign in again.'
        : 'Data on this iPhone stays here. You’ll return to the sign-in screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: session ? 'Sign Out' : 'Continue', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const syncLabel =
    sync.status === 'syncing'
      ? 'Syncing…'
      : sync.status === 'error'
        ? 'Problem'
        : sync.status === 'offline'
          ? 'Offline'
          : sync.lastSyncedAt
            ? 'Up to Date'
            : 'Waiting';
  const lastSync = sync.lastSyncedAt
    ? `${relativeLabel(isoToKey(sync.lastSyncedAt) ?? todayKey()).toLowerCase()} at ${fmtClock(sync.lastSyncedAt)}`
    : 'not yet';

  return (
    <>
      <HeaderActions right={[{ key: 'done', label: 'Done', variant: 'done', onPress: close }]} />
      <ScrollScreen contentContainerStyle={{ paddingTop: 8 }}>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Avatar name={settings.name || session?.user.email || 'G'} size={88} />
          <Txt variant="title2" style={{ marginTop: 12 }}>
            {settings.name || 'Your Name'}
          </Txt>
          <Txt variant="subhead" color={c.label2} style={{ marginTop: 2 }}>
            {session?.user.email ?? 'Offline mode'}
          </Txt>
        </View>

        <Card style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
            <Txt variant="headline">Level {lvl.level}</Txt>
            <Txt variant="headline" weight="400" color={c.label2}>
              {'  '}
              {lvl.rank}
            </Txt>
            <View style={{ flex: 1 }} />
            <Txt variant="footnote" color={c.label2} tabular>
              {fmtNum(stats.xp)} XP
            </Txt>
          </View>
          <ProgressBar value={lvl.progress} height={6} />
          <Txt variant="footnote" color={c.label2} style={{ marginTop: 8 }}>
            {lvl.span - lvl.into} XP to Level {lvl.level + 1}
          </Txt>
        </Card>

        <Txt variant="title3" weight="700" style={{ marginTop: 26, marginBottom: 10, marginLeft: 4 }}>
          Highlights
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat icon="checkCircle" color={accent} label="Tasks Done" value={stats.tasks} />
          <Stat icon="clock" color={c.cyan} label="Blocks Done" value={stats.blocks} />
          <Stat icon="flame" color={c.orange} label="Current Streak" value={`${stats.streak}d`} />
          <Stat icon="medal" color={c.yellow} label="Best Streak" value={`${stats.best}d`} />
          <Stat icon="trophy" color={c.green} label="Goals Achieved" value={stats.goals} />
          <Stat icon="today" color={c.purple} label="Total XP" value={fmtNum(stats.xp)} />
        </View>

        <ListSection header="Name" style={{ marginTop: 28 }}>
          <InputRow
            value={name}
            onChangeText={setName}
            onEndEditing={saveName}
            onBlur={saveName}
            placeholder="Your name"
            autoCapitalize="words"
            returnKeyType="done"
          />
        </ListSection>

        <ListSection header="Appearance" style={{ marginTop: 24 }}>
          <View style={{ padding: 12 }}>
            <Segmented values={['Automatic', 'Light', 'Dark']} index={MODES.indexOf(settings.mode)} onChange={(i) => settings.set({ mode: MODES[i] })} />
          </View>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Txt variant="body" style={{ marginBottom: 12 }}>
              Accent Color
            </Txt>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {ACCENT_KEYS.map((k) => {
                const col = isDark ? ACCENTS[k].dark : ACCENTS[k].light;
                const on = settings.accent === k;
                return (
                  <Pressable
                    key={k}
                    hitSlop={6}
                    onPress={() => {
                      haptic.tap();
                      settings.set({ accent: k });
                    }}
                    style={{ alignItems: 'center', gap: 6 }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        borderWidth: 2.5,
                        borderColor: on ? col : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: col, alignItems: 'center', justifyContent: 'center' }}>
                        {on ? <Icon name="check" size={13} color="#FFFFFF" weight="bold" /> : null}
                      </View>
                    </View>
                    <Txt variant="caption2" color={on ? c.label : c.label2}>
                      {ACCENTS[k].name}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ListSection>

        <ListSection header="Feedback" style={{ marginTop: 24 }} inset={60}>
          <Row
            icon="haptics"
            iconColor={c.pink}
            title="Haptics"
            right={
              <Switch
                value={settings.haptics}
                onValueChange={(v) => {
                  settings.set({ haptics: v });
                  if (v) haptic.success();
                }}
                trackColor={{ true: c.green }}
              />
            }
          />
        </ListSection>

        <ListSection
          header="Account"
          footer={
            session
              ? `Last synced ${lastSync}${pending ? ` · ${pending} change${pending === 1 ? '' : 's'} waiting` : ''}.${
                  sync.status === 'error' && sync.error ? ` ${sync.error}` : ''
                }`
              : 'Your data lives only on this iPhone. Create an account to back it up and use it on any device — your current data comes with you.'
          }
          style={{ marginTop: 24 }}
          inset={60}
        >
          {session ? (
            <Row icon="cloud" iconColor={c.blue} title="Cloud Sync" value={syncLabel} valueColor={sync.status === 'error' ? c.red : c.label2} />
          ) : (
            <Row icon="cloud" iconColor={c.blue} title="Back Up Your Data" chevron onPress={() => settings.set({ guest: false })} />
          )}
          {session ? <Row icon="sync" iconColor={c.green} title="Sync Now" onPress={() => void syncNow()} /> : null}
        </ListSection>

        <ListSection style={{ marginTop: 24 }}>
          <Row title={session ? 'Sign Out' : 'Exit Offline Mode'} titleColor={c.red} center onPress={doSignOut} />
        </ListSection>

        <Txt variant="footnote" color={c.label3} center style={{ marginTop: 22 }}>
          GrindZone {Constants.expoConfig?.version ?? '1.0'} · Stay locked in.
        </Txt>
      </ScrollScreen>
    </>
  );
}

function Stat({ icon, color, label, value }: { icon: IconName; color: string; label: string; value: number | string }) {
  const { c } = useTheme();
  return (
    <Card style={{ width: '48%', flexGrow: 1, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={14} color={color} />
        <Txt variant="subhead" weight="600" color={color}>
          {label}
        </Txt>
      </View>
      <Txt design="rounded" weight="700" size={30} tabular color={c.label} style={{ lineHeight: 34 }}>
        {value}
      </Txt>
    </Card>
  );
}
