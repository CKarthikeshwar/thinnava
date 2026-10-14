import type { ComponentType } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { colors, shadows, size } from '@/theme';
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={[styles.btn, { backgroundColor: bg, boxShadow: ghost || active ? undefined : shadows.iconButton }, style]}
    >
      <Icon size={22} color={fg} strokeWidth={2} fill={active ? fg : 'none'} />
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
