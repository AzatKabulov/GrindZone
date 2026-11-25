import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettings } from '@/store/settings';

const enabled = () => Platform.OS !== 'web' && useSettings.getState().haptics;
const safe = (p: Promise<void>) => p.catch(() => {});

export const haptic = {
  tap() {
    if (enabled()) safe(Haptics.selectionAsync());
  },
  light() {
    if (enabled()) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium() {
    if (enabled()) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  heavy() {
    if (enabled()) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  success() {
    if (enabled()) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning() {
    if (enabled()) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** A short "drum roll" for big wins. */
  celebrate() {
    if (!enabled()) return;
    safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 180);
    setTimeout(() => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)), 330);
    setTimeout(() => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 480);
  },
};
