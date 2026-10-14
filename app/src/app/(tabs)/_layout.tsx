import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { NavBar, SnackbarHost, SpeedDial, showSnack, NAV_HEIGHT, type DialAction } from '@/components';
import { colors, curves, durations } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Main tabs (spec §14 B): Home · Search · + · Map · Profile.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const onPick = (a: DialAction) => {
    // The real flows arrive in M4 (visit) and M5 (friend / internet).
    const what = { visit: 'Adding a visit', friend: "Logging a friend's experience", internet: 'Logging an internet find' }[a];
    showSnack({ text: `${what} arrives in a later milestone.` });
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(p) => <NavBar {...p} />}
        screenOptions={{
          headerShown: false,
          // Soft crossfade between tabs (spec §16.7); the bar itself never moves.
          animation: 'fade',
          transitionSpec: { animation: 'timing', config: { duration: durations.tab, easing: curves.standard.factory() } },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="search" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <SpeedDial onPick={onPick} />
      <SnackbarHost bottom={NAV_HEIGHT + insets.bottom + 10} />
    </View>
  );
}
