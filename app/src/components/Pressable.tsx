import { createContext, useContext } from 'react';
import { Platform, Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { curves, durations, reduceMotion } from '@/theme';

const APressable = Animated.createAnimatedComponent(RNPressable);

// Web (spec §18.3): react-native-web renders role "button" as a real <button>, and HTML forbids a button inside a
// button (a photo inside a card, Accept inside a notification row). Inner ones drop the role on web; they stay
// clickable and keep their label. Android is unchanged.
const InsidePressable = createContext(false);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed (1 = no shrink). */
  pressScale?: number;
};

/** Pressable with the app's standard press feedback: a quick shrink and dim (≤150 ms). */
export function Pressable({ style, pressScale = 0.97, onPressIn, onPressOut, onHoverIn, onHoverOut, disabled, accessibilityRole, children, ...rest }: Props) {
  // Laptop web: a light dim on hover so everything tappable feels tappable (spec §18.3).
  const hover = useSharedValue(0);
  const nested = useContext(InsidePressable);
  const role = Platform.OS === 'web' && nested && (accessibilityRole === 'button' || accessibilityRole === 'link') ? undefined : accessibilityRole;
  const p = useSharedValue(0);
  // Disabled controls sit at 40% opacity (DESIGN.md "Buttons"); the press dim multiplies on top.
  const base = disabled ? 0.4 : 1;
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressScale) * p.value }],
    opacity: base * (1 - 0.12 * p.value) * (1 - 0.08 * hover.value),
  }), [base, pressScale]);
  const cfg = { duration: durations.press, easing: curves.standard, reduceMotion };
  return (
    <APressable
      disabled={disabled}
      onPressIn={(e) => {
        p.value = withTiming(1, cfg);
        onPressIn?.(e);
      }}
      onHoverIn={(e) => { if (!disabled) hover.value = withTiming(1, cfg); onHoverIn?.(e); }}
      onHoverOut={(e) => { hover.value = withTiming(0, cfg); onHoverOut?.(e); }}
      onPressOut={(e) => {
        p.value = withTiming(0, cfg);
        onPressOut?.(e);
      }}
      style={[style, anim]}
      accessibilityRole={role}
      {...rest}
    >
      {(state) => <InsidePressable.Provider value>{typeof children === 'function' ? children(state) : children}</InsidePressable.Provider>}
    </APressable>
  );
}
