import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { NAV_HEIGHT, SnackbarHost } from '@/components';
import { LocationExplainer } from '@/features/places/LocationExplainer';
import { PERSIST_MAX_AGE, queryClient, queryPersister } from '@/lib/queryClient';
import { flush, startOutbox } from '@/lib/outbox';
import { Splash } from '@/features/auth/Splash';
import { useAuth, useAuthBootstrap } from '@/features/auth/session';
import { useShareImport } from '@/features/import/useShareImport';
import { PushExplainer, usePush } from '@/features/notifications/push';
import { colors, shadows } from '@/theme';
import { COLUMN_MAX, useLayoutMode } from '@/lib/layout';
import { WebTopBar, isTabPath } from '@/features/web/TopBar';
import { usePathname } from 'expo-router';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();
// Offline (spec §13, §26.5): watch the network and send queued writes when possible.
startOutbox();

// Root layout (spec §26.2–26.3): fonts, providers and the auth gate.
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaProvider>
          <PersistQueryClientProvider client={queryClient} onSuccess={() => void flush()}
            persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE, buster: 'v1' }}>
            <BottomSheetModalProvider>
              <StatusBar style="dark" />
              <Frame>
                <Gate />
                <Snacks />
              </Frame>
              <LocationExplainer />
              <PushExplainer />
            </BottomSheetModalProvider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}

/**
 * Auth gate: signed out → intro/welcome; signed in without a profile → setup; otherwise the app.
 * While the session loads, the A1 splash shows.
 */
function Gate() {
  useAuthBootstrap();
  const status = useAuth((s) => s.status);
  useShareImport(status === 'ready');
  usePush(status === 'ready');
  if (status === 'loading') return <Splash />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/delete-account" />
        <Stack.Screen name="dev/gallery" />
        <Stack.Screen name="pick-place" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="place/[placeId]" options={{ animation: 'fade' }} />
        <Stack.Screen name="visit/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="visit/[id]/edit" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="entry/[type]/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="saved/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="saved/[id]/edit" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="import" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="settings/friend-names" />
        <Stack.Screen name="settings/blocked" />
        <Stack.Screen name="settings/companion-names" />
        <Stack.Screen name="settings/about" />
        <Stack.Screen name="settings/drafts" />
        <Stack.Screen name="people/[userId]" />
        <Stack.Screen name="connections" />
        <Stack.Screen name="lists/index" />
        <Stack.Screen name="lists/[id]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="tag/[tagId]" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'needsProfile'}>
        <Stack.Screen name="setup" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Web (spec §18.3): the top bar above everything once signed in (on a phone browser only on the four main pages,
 * which have no other bar). On a laptop, screens other than the four pages sit in a centred column.
 */
function Frame({ children }: { children: React.ReactNode }) {
  const mode = useLayoutMode();
  const status = useAuth((s) => s.status);
  const path = usePathname();
  if (mode === 'app') return <>{children}</>;
  const tab = isTabPath(path);
  const bar = status === 'ready' && (mode === 'laptop' || tab);
  const column = mode === 'laptop' && !tab && path !== '/welcome' && status !== 'loading';
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {bar ? <WebTopBar mode={mode} /> : null}
      <View style={[{ flex: 1 }, column && { width: '100%', maxWidth: COLUMN_MAX, alignSelf: 'center', backgroundColor: colors.background, boxShadow: shadows.card }]}>
        {children}
      </View>
    </View>
  );
}

/** One snackbar host for the whole app, sitting just above the nav bar (web: no nav bar). */
function Snacks() {
  const insets = useSafeAreaInsets();
  const web = useLayoutMode() !== 'app';
  return <SnackbarHost bottom={web ? 24 : NAV_HEIGHT + insets.bottom + 10} />;
}
