import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { curves, durations, reduceMotion } from '@/theme';

const APressable = Animated.createAnimatedComponent(RNPressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed (1 = no shrink). */
  pressScale?: number;
};

/** Pressable with the app's standard press feedback: a quick shrink and dim (≤150 ms). */
export function Pressable({ style, pressScale = 0.97, onPressIn, onPressOut, disabled, ...rest }: Props) {
  const p = useSharedValue(0);
  // Disabled controls sit at 40% opacity (DESIGN.md "Buttons"); the press dim multiplies on top.
  const base = disabled ? 0.4 : 1;
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressScale) * p.value }],
    opacity: base * (1 - 0.12 * p.value),
  }), [base, pressScale]);
  const cfg = { duration: durations.press, easing: curves.standard, reduceMotion };
  return (
    <APressable
      disabled={disabled}
      onPressIn={(e) => {
        p.value = withTiming(1, cfg);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.value = withTiming(0, cfg);
        onPressOut?.(e);
      }}
      style={[style, anim]}
      {...rest}
    />
  );
}
