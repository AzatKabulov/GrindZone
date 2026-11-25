import { Stack } from 'expo-router';

import { useStackOptions } from '@/components/header';

export default function PlanLayout() {
  const options = useStackOptions(false, true);
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Plan' }} />
    </Stack>
  );
}
