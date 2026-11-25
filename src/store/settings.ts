import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AccentKey, ThemeMode } from '@/theme/tokens';

interface SettingsState {
  mode: ThemeMode;
  accent: AccentKey;
  haptics: boolean;
  /** Display name / callsign shown on Today. */
  name: string;
  /** User chose to use the app without an account (local only). */
  guest: boolean;
  hydrated: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'hydrated'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      mode: 'system',
      accent: 'orange',
      haptics: true,
      name: '',
      guest: false,
      hydrated: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'gz-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, set, ...rest }) => rest,
      onRehydrateStorage: () => () => {
        useSettings.setState({ hydrated: true });
      },
    },
  ),
);
