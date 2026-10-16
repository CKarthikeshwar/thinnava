import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { colors, fonts, MAX_FONT_SCALE, radii, strokes } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

export const DISH_MAX_ITEMS = 10;
export const DISH_MAX_LEN = 40;

/** Adds a dish if valid: trimmed, 1–40 chars, case-insensitive duplicates dropped, ≤10 items (spec §6.1). */
export function addDish(list: string[], raw: string): string[] {
  const v = raw.trim().replace(/\s+/g, ' ').slice(0, DISH_MAX_LEN);
  if (!v || list.length >= DISH_MAX_ITEMS) return list;
  if (list.some((d) => d.toLowerCase() === v.toLowerCase())) return list;
  return [...list, v];
}

type Props = { label: string; optional?: boolean; value: string[]; onChange: (v: string[]) => void; placeholder?: string };

/** Free-text dish chips for "Loved" / "Didn't like": type, press Enter or Add. */
export function ChipInput({ label, optional, value, onChange, placeholder = 'Type a dish' }: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const full = value.length >= DISH_MAX_ITEMS;
  const commit = () => {
    onChange(addDish(value, text));
    setText('');
  };
  return (
    <View style={styles.wrap}>
      <T variant="fieldLabel">
        {label}
        {optional ? <T variant="fieldLabel" style={{ fontFamily: fonts.bodySemi, fontSize: 12 }} color={colors.inkMuted}> optional</T> : null}
      </T>
      <View style={[styles.box, { boxShadow: focused ? strokes.focus : strokes.field }]}>
        {value.map((d) => (
          <View key={d} style={styles.chip}>
            <T style={styles.chipText} color={colors.onPrimaryContainer}>{d}</T>
            <Pressable onPress={() => onChange(value.filter((x) => x !== d))} hitSlop={10} accessibilityLabel={`Remove ${d}`}>
              <X size={14} color={colors.onPrimaryContainer} strokeWidth={2.4} />
            </Pressable>
          </View>
        ))}
        {!full ? (
          <View style={styles.adder}>
            {/* Idle: a quiet "+ Add" like the D2 mockup; focused: a plain text field. */}
            {!focused && !text ? <Plus size={16} color={colors.primary} strokeWidth={2.4} style={{ marginLeft: 6 }} pointerEvents="none" /> : null}
            <TextInput
              value={text}
              onChangeText={(t) => setText(t.slice(0, DISH_MAX_LEN))}
              onSubmitEditing={commit}
              submitBehavior="submit"
              returnKeyType="done"
              placeholder={focused ? placeholder : 'Add'}
              placeholderTextColor={focused ? colors.inkMuted : colors.primary}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              cursorColor={colors.primary}
              accessibilityLabel={`${label}: add a dish`}
              style={[styles.input, !focused && !text && styles.inputIdle]}
              onFocus={() => setFocused(true)}
              onBlur={() => { setFocused(false); if (text.trim()) commit(); }}
            />
            {text.trim() ? (
              <Pressable onPress={commit} style={styles.add} accessibilityRole="button" accessibilityLabel="Add">
                <Plus size={16} color={colors.primary} strokeWidth={2.4} />
                <T style={styles.addText} color={colors.primary}>Add</T>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: { minHeight: 50, borderRadius: radii.field, backgroundColor: colors.surface, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, borderRadius: radii.chip, paddingLeft: 12, paddingRight: 8, backgroundColor: colors.primaryContainer },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 13.5 },
  adder: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, minWidth: 120 },
  input: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15.5, color: colors.ink, paddingVertical: 4, paddingHorizontal: 6 },
  inputIdle: { fontFamily: fonts.bodyHeavy, fontSize: 13.5, paddingLeft: 4 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, height: 32 },
  addText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
