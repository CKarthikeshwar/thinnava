import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { BellOff, BellRing } from 'lucide-react-native';
import { create } from 'zustand';
import { Dialog, Pressable, T } from '@/components';
import { colors, fonts, radii, space } from '@/theme';
import { storage } from '@/lib/storage';
import { registerPushToken, unregisterPushToken } from './api';

/**
 * Push on Android (spec §12, §14 A7, §26.9). Expo's push service (free) forwards to FCM (Firebase `thinnava-f44c7`, Spark).
 * Permission is asked once per install: the first time Home opens after sign-in (so requests that arrive before the
 * user has sent any still reach them), or earlier if they send a request or tag someone first. An explainer shows, then
 * Android's own prompt. While push is off, F1 shows a "Turn on" row. Every step fails quietly; notifications still
 * show in-app (F1) without push.
 */

let token: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const projectId = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;

/** Gets this device's Expo token and stores it for the signed-in user. Only runs when permission is already granted. */
async function register() {
  try {
    if (!projectId) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Thinnava', importance: Notifications.AndroidImportance.HIGH });
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    token = data;
    await registerPushToken(data);
  } catch {
    // No Firebase config yet, offline, or backend hiccup: try again next start.
  }
}

/** On sign-out, this device stops getting the old account's pushes. */
export async function forgetPushToken() {
  if (!token) return;
  try { await unregisterPushToken(token); } catch {}
  token = null;
}

type State = { open: boolean; name: string | null; general: boolean; resolve: ((yes: boolean) => void) | null };
const useExplainer = create<State>(() => ({ open: false, name: null, general: false, resolve: null }));

/**
 * Call after the user sends a request or tags someone (with their name), or with no name for the first-run ask.
 * Shows the explainer once per install (when Android can still ask), then the system prompt; registers the token if allowed.
 */
export async function askPushInContext(name?: string) {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) return register();
    // "Not now" is respected: the explainer shows only once per install.
    if (!perm.canAskAgain || useExplainer.getState().open || storage.getBoolean('pushExplained')) return;
    storage.set('pushExplained', true);
    const yes = await new Promise<boolean>((resolve) => useExplainer.setState({
      open: true, name: name ?? null, general: !name,
      resolve: (v) => { useExplainer.setState({ open: false, resolve: null }); resolve(v); },
    }));
    if (!yes) return;
    if ((await Notifications.requestPermissionsAsync()).granted) await register();
  } catch {}
}

/** Mounted once while signed in: refreshes the token on start and opens the screen a tapped push points to. */
export function usePush(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    Notifications.getPermissionsAsync().then((p) => { if (p.granted) register(); }).catch(() => {});
    // First run after sign-in: ask once, after Home has had a moment to draw.
    const ask = setTimeout(() => { askPushInContext(); }, 1500);
    const open = (r: Notifications.NotificationResponse | null) => {
      const route = r?.notification.request.content.data?.route;
      Notifications.clearLastNotificationResponse();
      if (typeof route === 'string' && route.startsWith('/')) router.push(route as Href);
    };
    // A push tapped while the app was closed.
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => { clearTimeout(ask); sub.remove(); };
  }, [enabled]);
}

/** A7 push explainer (spec §14). Mounted in the root layout. */
export function PushExplainer() {
  const { open, name, general, resolve } = useExplainer();
  return (
    <Dialog
      visible={open}
      icon={BellRing}
      title={general ? 'Turn on notifications?' : `Know when ${name} says yes?`}
      body={general
        ? "Get a ping when friends send you a request or tag you. Nothing else, unless you turn on more for someone."
        : "We'll only notify you about requests and tags, unless you turn on more for someone."}
      confirmLabel="Turn on"
      cancelLabel="Not now"
      onConfirm={() => resolve?.(true)}
      onCancel={() => resolve?.(false)}
    />
  );
}

/**
 * F1 row while push is off (spec §14 F1): "Turn on" asks Android directly, or opens the app's system settings
 * once Android won't ask again. Hidden when push is on; rechecked when the user comes back from settings.
 */
export function PushOffRow() {
  const [off, setOff] = useState<{ canAsk: boolean } | null>(null);
  useEffect(() => {
    const check = () => Notifications.getPermissionsAsync()
      .then((p) => setOff(p.granted ? null : { canAsk: p.canAskAgain }))
      .catch(() => {});
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, []);
  if (!off) return null;
  const turnOn = async () => {
    if (!off.canAsk) { Linking.openSettings(); return; }
    const p = await Notifications.requestPermissionsAsync().catch(() => null);
    if (p?.granted) { setOff(null); register(); } else if (p) setOff({ canAsk: p.canAskAgain });
  };
  return (
    <Pressable onPress={turnOn} accessibilityRole="button" accessibilityLabel="Notifications are off. Turn on" style={styles.off}>
      <BellOff size={18} color={colors.inkSoft} strokeWidth={2} />
      <T style={styles.offText}>Notifications are off</T>
      <T style={styles.offAction}>Turn on</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  off: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: space.gutter, marginTop: 10, marginBottom: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radii.thumb, backgroundColor: colors.background },
  offText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  offAction: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.primary },
});
