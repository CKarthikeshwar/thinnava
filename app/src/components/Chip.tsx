import type { ComponentType } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronDown, X, type LucideProps } from 'lucide-react-native';
import { colors, fonts, radii, size, strokes } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

type Props = {
  label: string;
  selected?: boolean;
  icon?: ComponentType<LucideProps>;
  dropdown?: boolean; // trailing chevron
  removable?: boolean; // trailing × (active filter chip)
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Filter / choice chip: 34 dp, 10 dp corners, hairline stroke; selected = Pale Cobalt. */
export function Chip({ label, selected, icon: Icon, dropdown, removable, onPress, style }: Props) {
  const fg = selected ? colors.onPrimaryContainer : colors.inkSoft;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      hitSlop={{ top: 7, bottom: 7 }}
      style={[styles.chip, selected ? styles.on : styles.off, style]}
    >
      {Icon ? <Icon size={16} color={fg} strokeWidth={2} /> : null}
      <T style={styles.text} color={fg} numberOfLines={1}>{label}</T>
      {dropdown ? <ChevronDown size={16} color={fg} strokeWidth={2} /> : null}
      {removable ? <X size={16} color={fg} strokeWidth={2} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { height: size.chip, borderRadius: radii.chip, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  off: { backgroundColor: colors.surface, boxShadow: strokes.hairline },
  on: { backgroundColor: colors.primaryContainer },
  text: { fontFamily: fonts.bodyBold, fontSize: 13.5 },
});
