import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, size, strokes } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

type Variant = 'primary' | 'tonal' | 'outline' | 'white' | 'strong';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  small?: boolean;
  disabled?: boolean;
  icon?: ComponentType<LucideProps>;
  /** Custom leading element (e.g. the Google mark). */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const look: Record<Variant, { bg: string; fg: string; shadow?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  strong: { bg: colors.primaryStrong, fg: colors.onPrimary },
  tonal: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  outline: { bg: 'transparent', fg: colors.primary, shadow: strokes.field },
  white: { bg: colors.surface, fg: '#1F1F1F' },
};

/** Full-pill button (DESIGN.md "Buttons"). One primary per screen. Disabled = 40% opacity. */
export function Button({ label, onPress, variant = 'primary', small, disabled, icon: Icon, leading, style, accessibilityHint }: Props) {
  const l = look[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.base,
        small ? styles.small : styles.full,
        { backgroundColor: l.bg, boxShadow: l.shadow },
        style,
      ]}
    >
      {leading}
      {Icon ? <Icon size={small ? 18 : 20} color={l.fg} strokeWidth={2} /> : null}
      <T variant={small ? 'buttonSmall' : 'button'} color={l.fg} numberOfLines={1}>
        {label}
      </T>
    </Pressable>
  );
}

/** Google "G" mark in a white circle, for "Continue with Google". */
export function GoogleMark() {
  return (
    <View style={styles.gWrap}>
      <Svg width={20} height={20} viewBox="0 0 48 48">
        <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radii.pill },
  full: { height: size.button, alignSelf: 'stretch', paddingHorizontal: 20 },
  small: { height: size.buttonSmall, paddingHorizontal: 16, alignSelf: 'flex-start' },
  gWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
