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
import { QueryClientProvider } from '@tanstack/react-query';
import { NAV_HEIGHT, SnackbarHost } from '@/components';
import { LocationExplainer } from '@/features/places/LocationExplainer';
import { queryClient } from '@/lib/queryClient';
import { Splash } from '@/features/auth/Splash';
import { useAuth, useAuthBootstrap } from '@/features/auth/session';
import { useShareImport } from '@/features/import/useShareImport';
import { PushExplainer, usePush } from '@/features/notifications/push';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

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
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <StatusBar style="dark" />
              <Gate />
              <Snacks />
              <LocationExplainer />
              <PushExplainer />
            </BottomSheetModalProvider>
          </QueryClientProvider>
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

/** One snackbar host for the whole app, sitting just above the nav bar. */
function Snacks() {
  const insets = useSafeAreaInsets();
  return <SnackbarHost bottom={NAV_HEIGHT + insets.bottom + 10} />;
}
