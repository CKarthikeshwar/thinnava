import * as Application from 'expo-application';
import { Linking } from 'react-native';

/** F2 "Notifications" (spec §14): opens Android's notification settings for this app, else the app's settings page. */
export async function openNotificationSettings() {
  try {
    await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: Application.applicationId ?? 'com.thinnava.app' },
    ]);
  } catch {
    await Linking.openSettings().catch(() => {});
  }
}
export const hasNotificationSettings = true;
