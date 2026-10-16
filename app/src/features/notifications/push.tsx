import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { BellRing } from 'lucide-react-native';
import { create } from 'zustand';
import { Dialog } from '@/components';
import { storage } from '@/lib/storage';
import { registerPushToken, unregisterPushToken } from './api';

/**
 * Push on Android (spec §12, §14 A7, §26.9). Expo's push service (free) forwards to FCM (Firebase `thinnava-f44c7`, Spark).
 * Permission is asked in context: the first time the user sends a request or tags someone, an explainer shows,
 * then Android's own prompt. Every step fails quietly; notifications still show in-app (F1) without push.
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

type State = { open: boolean; name: string | null; resolve: ((yes: boolean) => void) | null };
const useExplainer = create<State>(() => ({ open: false, name: null, resolve: null }));

/**
 * Call after the user sends a request or tags someone. Shows the explainer once (when Android can still ask),
 * then the system prompt; registers the token if allowed.
 */
export async function askPushInContext(name?: string) {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) return register();
    // "Not now" is respected: the explainer shows only once per install.
    if (!perm.canAskAgain || useExplainer.getState().open || storage.getBoolean('pushExplained')) return;
    storage.set('pushExplained', true);
    const yes = await new Promise<boolean>((resolve) => useExplainer.setState({
      open: true, name: name ?? null,
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
    const open = (r: Notifications.NotificationResponse | null) => {
      const route = r?.notification.request.content.data?.route;
      Notifications.clearLastNotificationResponse();
      if (typeof route === 'string' && route.startsWith('/')) router.push(route as Href);
    };
    // A push tapped while the app was closed.
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [enabled]);
}

/** A7 push explainer (spec §14). Mounted in the root layout. */
export function PushExplainer() {
  const { open, name, resolve } = useExplainer();
  return (
    <Dialog
      visible={open}
      icon={BellRing}
      title={`Know when ${name ?? 'they'} ${name ? 'says' : 'say'} yes?`}
      body="We'll only notify you about requests and tags, unless you turn on more for someone."
      confirmLabel="Turn on"
      cancelLabel="Not now"
      onConfirm={() => resolve?.(true)}
      onCancel={() => resolve?.(false)}
    />
  );
}
