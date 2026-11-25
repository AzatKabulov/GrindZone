import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Empty, IconBtn, Press, Screen, ScreenTitle, TAB_BAR_SPACE, Txt } from '@/components/ui';
import { addDays, startOfWeek, todayKey, weekdayShort } from '@/lib/date';
import { toggleHabit } from '@/store/actions';
import { useData, type Habit } from '@/store/data';
import { alive, habitStreak } from '@/store/selectors';
import { alpha, useTheme } from '@/theme';

/** Daily habits: one tap to check today, this week (Mon → Sun) at a glance. */
export default function HabitsScreen() {
  const habits = useData((s) => s.habits);
  const today = todayKey();
  const list = [...alive(habits)].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const doneToday = list.filter((h) => (h.checks ?? []).includes(today)).length;
  const add = () => router.push({ pathname: '/habit/[id]', params: { id: 'new' } });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE }} showsVerticalScrollIndicator={false}>
        <ScreenTitle
          kicker={list.length ? `${doneToday}/${list.length} DONE TODAY` : undefined}
          title="HABITS"
          right={<IconBtn icon="add" accentFill onPress={add} />}
        />
        {list.length === 0 ? (
          <Empty
            icon="repeat"
            title="NO HABITS YET"
            text="Pick a few things you want to do every day — train, read, no sugar. Then check them off."
            action="ADD A HABIT"
            onAction={add}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {list.map((h, i) => (
              <Animated.View key={h.id} entering={FadeInDown.delay(i * 40).duration(350)}>
                <HabitCard habit={h} today={today} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function HabitCard({ habit, today }: { habit: Habit; today: string }) {
  const { c, accent, onAccent } = useTheme();
  const checks = new Set(habit.checks ?? []);
  const doneToday = checks.has(today);
  const streak = habitStreak(habit, today);
  // This week, Monday first. Days that haven't happened yet can't be checked.
  const monday = startOfWeek(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <Press
      scaleTo={0.985}
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
      style={{
        padding: 16,
        borderRadius: 18,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: doneToday ? alpha(accent, 0.45) : c.border,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          {habit.emoji ? <Text style={{ fontSize: 24 }}>{habit.emoji}</Text> : <Ionicons name="repeat" size={20} color={c.textDim} />}
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="title" numberOfLines={1}>
            {habit.title || 'Untitled habit'}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="flame" size={12} color={streak ? accent : c.textFaint} />
            <Txt variant="small" color={streak ? c.text : c.textDim}>
              {streak ? `${streak}-day streak` : 'No streak yet'}
            </Txt>
          </View>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => toggleHabit(habit.id, today)}
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: doneToday ? accent : c.borderStrong,
            backgroundColor: doneToday ? accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark-sharp" size={24} color={doneToday ? onAccent : c.textFaint} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {week.map((d) => {
          const on = checks.has(d);
          const future = d > today;
          return (
            <Pressable
              key={d}
              hitSlop={4}
              disabled={future}
              onPress={() => toggleHabit(habit.id, d)}
              style={{ alignItems: 'center', gap: 5, opacity: future ? 0.35 : 1 }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  backgroundColor: on ? accent : c.surface3,
                  borderWidth: d === today ? 1.5 : 0,
                  borderColor: c.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {on ? <Ionicons name="checkmark-sharp" size={15} color={onAccent} /> : null}
              </View>
              <Txt variant="label" style={{ fontSize: 9 }} color={d === today ? c.text : c.textFaint}>
                {weekdayShort(d).charAt(0)}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </Press>
  );
}
