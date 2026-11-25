import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/header';

export default function GoalsLayout() {
  const options = useStackOptions(true);
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Goals' }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
