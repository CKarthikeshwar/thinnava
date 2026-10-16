import { View } from 'react-native';
import { router, Tabs } from 'expo-router';
import { NavBar, SpeedDial, type DialAction } from '@/components';
import { ListPromptHost } from '@/features/people/ListPromptHost';
import { colors, curves, durations } from '@/theme';

// Main tabs (spec §14 B): Home · Search · + · Map · Profile.
export default function TabsLayout() {
  const onPick = (a: DialAction) => {
    if (a === 'visit') return router.push({ pathname: '/pick-place', params: { for: 'visit' } });
    // D5 by hand; it offers "Use copied text?" when something is copied (spec §10.4).
    router.push({ pathname: '/saved/new', params: { source: a } });
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
      <ListPromptHost />
    </View>
  );
}
