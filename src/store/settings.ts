import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AccentKey, ThemeMode } from '@/theme/tokens';

interface SettingsState {
  mode: ThemeMode;
  accent: AccentKey;
  haptics: boolean;
  /** Display name. */
  name: string;
  /** User chose to use the app without an account (local only). */
  guest: boolean;
  /** Your own headline for Today; empty = rotating daily quotes. */
  customMantra: string;
  /** Font size of the Today headline. */
  mantraSize: number;
  /** How the Plan tab shows a day: a list like a written plan, or the hour timeline. */
  planView: 'list' | 'timeline';
  hydrated: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'hydrated'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      mode: 'system',
      accent: 'ember',
      haptics: true,
      name: '',
      guest: false,
      customMantra: '',
      mantraSize: 48,
      planView: 'list',
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
