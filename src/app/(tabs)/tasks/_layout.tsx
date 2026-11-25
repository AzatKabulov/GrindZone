import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/header';

export default function TasksLayout() {
  const options = useStackOptions(true);
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Tasks' }} />
    </Stack>
  );
}
