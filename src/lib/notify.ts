import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local notifications for the focus timer, so you hear about it even with the phone locked.
 * While the app is open the timer screen handles it, so banners are suppressed in the foreground.
 */

let ready = false;
let ids: string[] = [];

function setup() {
  if (ready || Platform.OS === 'web') return;
  ready = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function allowed(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export async function cancelFocusAlerts() {
  if (Platform.OS === 'web') return;
  const old = ids;
  ids = [];
  await Promise.all(old.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/** Schedule "focus done" at `focusEnd` and "break over" at `breakEnd` (epoch ms; either may be null). */
export async function scheduleFocusAlerts(alerts: { at: number; title: string; body: string }[]) {
  if (Platform.OS === 'web') return;
  setup();
  await cancelFocusAlerts();
  if (!(await allowed())) return;
  const now = Date.now();
  for (const a of alerts) {
    if (a.at <= now + 1000) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: a.title, body: a.body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(a.at) },
      });
      ids.push(id);
    } catch {
      // Notifications are a bonus; the in-app timer still works without them.
    }
  }
}
