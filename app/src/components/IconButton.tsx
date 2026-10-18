import { useEffect, useRef, type ComponentType } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { colors, curves, shadows, size, useMotion } from '@/theme';
import { Pressable } from './Pressable';

type Props = {
  icon: ComponentType<LucideProps>;
  label: string; // accessibility label, always required
  onPress?: () => void;
  ghost?: boolean;
  badge?: boolean; // red notification dot
  active?: boolean; // filled primary (e.g. wishlisted heart)
  style?: StyleProp<ViewStyle>;
};

/** 48 dp round icon button (top bars). */
export function IconButton({ icon: Icon, label, onPress, ghost, badge, active, style }: Props) {
  const bg = active ? colors.primary : ghost ? 'transparent' : colors.surface;
  const fg = active ? colors.onPrimary : colors.ink;
  // Turning on (e.g. the wishlist heart) pops the icon once: 1.35×, 220 ms (DESIGN.md "Feedback"). Not on first render.
  const { reduced } = useMotion();
  const pop = useSharedValue(1);
  const was = useRef(active);
  useEffect(() => {
    if (active && !was.current && !reduced) {
      pop.value = withSequence(withTiming(1.35, { duration: 90, easing: curves.standard }), withTiming(1, { duration: 130, easing: curves.standard }));
    }
    was.current = active;
  }, [active]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={[styles.btn, { backgroundColor: bg, boxShadow: ghost || active ? undefined : shadows.iconButton }, style]}
    >
      <Animated.View style={popStyle}><Icon size={22} color={fg} strokeWidth={2} fill={active ? fg : 'none'} /></Animated.View>
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: size.touch, height: size.touch, borderRadius: size.touch / 2, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5,
    backgroundColor: colors.bad, borderWidth: 2, borderColor: colors.surface,
  },
});
