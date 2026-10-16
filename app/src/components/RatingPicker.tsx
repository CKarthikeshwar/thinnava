import { StyleSheet, View } from 'react-native';
import { colors, fonts, radii, strokes } from '@/theme';
import { Pressable } from './Pressable';
import { ratingLook, type Rating } from './ReviewPill';
import { T } from './T';

/** "How was it?": three big Good / Okayish / Bad buttons in the fixed verdict colours (spec §6.1, D2). */
export function RatingPicker({ value, onChange, allowNone }: { value: Rating | null; onChange: (r: Rating | null) => void; allowNone?: boolean }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {(['good', 'okayish', 'bad'] as Rating[]).map((r) => {
        const look = ratingLook[r];
        const on = value === r;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(on && allowNone ? null : r)}
            pressScale={0.95}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={look.label}
            style={[styles.btn, on ? { backgroundColor: look.bg, boxShadow: `inset 0px 0px 0px 2px ${look.fg}` } : styles.off]}
          >
            <look.Icon size={19} color={on ? look.fg : colors.inkSoft} strokeWidth={2} />
            <T style={styles.label} color={on ? look.fg : colors.inkSoft}>{look.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 50, borderRadius: radii.field, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  off: { backgroundColor: colors.surface, boxShadow: strokes.field },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14.5 },
});
