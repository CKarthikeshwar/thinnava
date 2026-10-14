import { useEffect, type ComponentType } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { Globe, MessageCircle, Utensils, type LucideProps } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, curves, durations, fonts, radii, reduceMotion, shadows, size, useMotion } from '@/theme';
import { NAV_HEIGHT, useDial } from './NavBar';
import { Pressable } from './Pressable';
import { T } from './T';

export type DialAction = 'visit' | 'friend' | 'internet';

const ITEMS: { key: DialAction; label: string; Icon: ComponentType<LucideProps>; lift: number }[] = [
  { key: 'visit', label: 'I went\nsomewhere', Icon: Utensils, lift: 0 },
  { key: 'friend', label: 'A friend\ntold me', Icon: MessageCircle, lift: 34 },
  { key: 'internet', label: 'Found it\nonline', Icon: Globe, lift: 0 },
];

/**
 * The + speed dial (spec §14 B3): three circles fan out of the + in 250 ms with a 30 ms stagger,
 * over a navy scrim. The nav bar stays visible above the scrim so the × can close it.
 */
export function SpeedDial({ onPick }: { onPick: (a: DialAction) => void }) {
  const { open, set } = useDial();
  const insets = useSafeAreaInsets();
  const { d, reduced } = useMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(open ? 1 : 0, { duration: d(open ? durations.dial : durations.short + 30), easing: open ? curves.decelerate : curves.accelerate, reduceMotion });
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { set(false); return true; });
    return () => sub.remove();
  }, [open]);

  const scrim = useAnimatedStyle(() => ({ opacity: t.value }));

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { bottom: NAV_HEIGHT + insets.bottom }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} pressScale={1} onPress={() => set(false)} accessibilityLabel="Close add menu" />
      </Animated.View>
      <View style={styles.row}>
        {ITEMS.map((it, i) => (
          <DialItem key={it.key} item={it} index={i} t={t} open={open} reduced={reduced} onPress={() => { set(false); onPick(it.key); }} />
        ))}
      </View>
    </View>
  );
}

function DialItem({ item, index, t, open, reduced, onPress }: { item: (typeof ITEMS)[number]; index: number; t: SharedValue<number>; open: boolean; reduced: boolean; onPress: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const cfg = { duration: reduced ? durations.short : durations.dial, easing: open ? curves.decelerate : curves.accelerate, reduceMotion };
    p.value = open ? withDelay(reduced ? 0 : index * durations.dialStagger, withTiming(1, cfg)) : withTiming(0, { ...cfg, duration: durations.short });
  }, [open]);
  const anim = useAnimatedStyle(() => {
    // Items start at the + (centre, bottom) and fan out to their spots.
    const fromX = (1 - index) * 114;
    const fromY = 96 - item.lift;
    const move = reduced ? 1 : p.value;
    return {
      opacity: p.value,
      transform: [
        { translateX: fromX * (1 - move) },
        { translateY: -item.lift + fromY * (1 - move) },
        { scale: reduced ? 1 : 0.4 + 0.6 * p.value },
      ],
    };
  });
  return (
    <Animated.View style={[styles.item, anim]}>
      <Pressable onPress={onPress} pressScale={0.94} style={styles.itemPress} accessibilityRole="button" accessibilityLabel={item.label.replace('\n', ' ')}>
        <View style={styles.circle}>
          <item.Icon size={26} color={colors.primaryStrong} strokeWidth={2} />
        </View>
        <View style={styles.labelBox}>
          <T style={styles.label} color={colors.ink}>{item.label}</T>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.dialScrim },
  row: { position: 'absolute', left: 0, right: 0, bottom: 18, flexDirection: 'row', justifyContent: 'center', gap: 22 },
  item: { width: 92 },
  itemPress: { alignItems: 'center', gap: 8 },
  circle: { width: size.dialCircle, height: size.dialCircle, borderRadius: size.dialCircle / 2, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', boxShadow: shadows.dialCircle },
  labelBox: { backgroundColor: colors.surface, borderRadius: radii.chip + 2, paddingVertical: 5, paddingHorizontal: 9, boxShadow: shadows.dialLabel },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 16, textAlign: 'center' },
});
