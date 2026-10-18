import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { CircleUserRound, House, Map, Plus, Search, type LucideProps } from 'lucide-react-native';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import type { ComponentType } from 'react';
import { colors, curves, durations, fonts, radii, reduceMotion, shadows, useMotion } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

/** Open/closed state of the + speed dial, shared by the nav bar and the dial overlay. */
export const useDial = create<{ open: boolean; set: (o: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));

const TAB_META: Record<string, { label: string; Icon: ComponentType<LucideProps> }> = {
  index: { label: 'Home', Icon: House },
  search: { label: 'Search', Icon: Search },
  map: { label: 'Map', Icon: Map },
  profile: { label: 'Profile', Icon: CircleUserRound },
};

export const NAV_HEIGHT = 64; // + bottom inset

/** Material 3 navigation bar: Home · Search · + · Map · Profile (spec §14 B). Only the pill indicator moves. */
export function NavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { open, set } = useDial();
  const routes = state.routes.filter((r) => TAB_META[r.name]);
  const tabs = routes.map((r) => {
    const i = state.routes.indexOf(r);
    return <Tab key={r.key} name={r.name} focused={state.index === i} onPress={() => {
      set(false);
      const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
      if (state.index !== i && !e.defaultPrevented) navigation.navigate(r.name);
    }} />;
  });
  return (
    <View style={[styles.bar, { height: NAV_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {tabs.slice(0, 2)}
      <AddButton open={open} onPress={() => set(!open)} />
      {tabs.slice(2)}
    </View>
  );
}

function Tab({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { Icon, label } = TAB_META[name];
  const { d } = useMotion();
  // Derived from `focused` itself, so the pill can never stay on a tab that isn't the current one.
  const dur = d(durations.short + 50);
  const on = useDerivedValue(() => withTiming(focused ? 1 : 0, { duration: dur, easing: curves.standard, reduceMotion }), [focused, dur]);
  const pill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], ['rgba(219,228,255,0)', colors.primaryContainer]),
    transform: [{ scaleX: 0.6 + 0.4 * on.value }],
  }));
  return (
    <Pressable onPress={onPress} pressScale={0.94} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
      <View style={styles.pillBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.pill, pill]} />
        {/* Above the pill: on web a transformed sibling would otherwise paint over the icon. */}
        <View style={styles.icon}><Icon size={22} color={focused ? colors.onPrimaryContainer : colors.inkSoft} strokeWidth={2} /></View>
      </View>
      <T style={[styles.label, focused && styles.labelOn]} color={focused ? colors.ink : colors.inkSoft}>{label}</T>
    </Pressable>
  );
}

function AddButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const { d } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(open ? 1 : 0, { duration: d(durations.dial), easing: curves.standard, reduceMotion });
  }, [open]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [colors.primary, colors.surface]),
  }));
  const icon = useAnimatedStyle(() => ({ transform: [{ rotate: `${135 * t.value}deg` }] }));
  return (
    <Pressable onPress={onPress} pressScale={0.92} style={styles.addWrap} accessibilityRole="button" accessibilityLabel={open ? 'Close add menu' : 'Add'} accessibilityState={{ expanded: open }}>
      <Animated.View style={[styles.add, box, { boxShadow: open ? shadows.dialCircle : shadows.addButton }]}>
        <Animated.View style={icon}>
          <Plus size={26} color={open ? colors.primaryStrong : colors.onPrimary} strokeWidth={2.2} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 6, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hairline, zIndex: 30 },
  tab: { width: 64, alignItems: 'center', gap: 4 },
  pillBox: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: 16 },
  icon: { zIndex: 1 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12 },
  labelOn: { fontFamily: fonts.bodyHeavy },
  addWrap: { width: 64, alignItems: 'center' },
  add: { width: 52, height: 52, borderRadius: radii.fab, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
});
