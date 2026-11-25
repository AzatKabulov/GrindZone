import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/header';

export default function NotesLayout() {
  const options = useStackOptions(true);
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Notes' }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
