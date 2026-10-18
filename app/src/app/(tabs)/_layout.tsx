import { Animated, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { router, Tabs } from 'expo-router';
import { NavBar, SpeedDial, type DialAction } from '@/components';
import { ListPromptHost } from '@/features/people/ListPromptHost';
import { colors, curves, durations } from '@/theme';
import { useLayoutMode } from '@/lib/layout';

/** Tab crossfade with a 98% → 100% settle for the tab arriving (and the leaving one easing back). */
const settle = ({ current }: { current: { progress: Animated.AnimatedInterpolation<number> } }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
    transform: [{ scale: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.98, 1, 0.98] }) }],
  },
});

// Main tabs (spec §14 B): Home · Search · + · Map · Profile.
export default function TabsLayout() {
  const reduced = useReducedMotion();
  // Web: the top bar (root layout) replaces the bottom bar and the + speed dial (spec §18.3).
  const web = useLayoutMode() !== 'app';
  const onPick = (a: DialAction) => {
    if (a === 'visit') return router.push({ pathname: '/pick-place', params: { for: 'visit' } });
    // D5 by hand; it offers "Use copied text?" when something is copied (spec §10.4).
    router.push({ pathname: '/saved/new', params: { source: a } });
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(p) => (web ? null : <NavBar {...p} />)}
        screenOptions={{
          headerShown: false,
          // Soft crossfade between tabs (spec §16.7); the bar itself never moves.
          animation: 'fade',
          // …and the arriving tab settles in from 98% (DESIGN.md "Tabs"), so there's never a blank frame.
          sceneStyleInterpolator: reduced ? undefined : settle,
          transitionSpec: { animation: 'timing', config: { duration: durations.tab, easing: curves.standard.factory() } },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="search" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="profile" />
      </Tabs>
      {web ? null : <SpeedDial onPick={onPick} />}
      <ListPromptHost />
    </View>
  );
}
