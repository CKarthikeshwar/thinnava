import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { CircleCheck, CircleX, Check, X } from 'lucide-react-native';
import { colors, fonts, MAX_FONT_SCALE, radii, size, strokes } from '@/theme';
import { T } from './T';

export type FieldStatus = { kind: 'neutral' | 'success' | 'error'; text: string } | null;

type Props = TextInputProps & {
  label: string;
  optional?: boolean;
  prefix?: ReactNode; // e.g. "@" or "₹"
  status?: FieldStatus;
  trailing?: ReactNode;
  /** Amber outline for a value the AI wasn't sure about (D8 "Please check this"). */
  warn?: boolean;
};

/** Text field (DESIGN.md "Inputs"): 54 dp, inset hairline; focus = 2 dp cobalt; error = 2 dp red. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, optional, prefix, status, trailing, warn, multiline, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const error = status?.kind === 'error';
  const stroke = error ? strokes.error : focused ? strokes.focus : warn ? `inset 0px 0px 0px 2px ${colors.check}` : strokes.field;
  return (
    <View style={styles.field}>
      <T variant="fieldLabel">
        {label}
        {optional ? <T variant="fieldLabel" style={styles.optional} color={colors.inkMuted}> optional</T> : null}
      </T>
      <View style={[styles.box, multiline && styles.multi, { boxShadow: stroke }]}>
        {prefix ? <T style={styles.prefix} color={colors.inkMuted}>{prefix}</T> : null}
        <TextInput
          ref={ref}
          multiline={multiline}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          placeholderTextColor={colors.inkMuted}
          cursorColor={error ? colors.bad : colors.primary}
          selectionColor={colors.primaryContainer}
          accessibilityLabel={label}
          style={[styles.input, multiline && styles.inputMulti, style]}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {error ? <CircleX size={20} color={colors.bad} strokeWidth={2} /> : status?.kind === 'success' ? <CircleCheck size={20} color={colors.good} strokeWidth={2} /> : trailing}
      </View>
      {status?.text ? (
        <View style={styles.help} accessibilityLiveRegion="polite">
          {status.kind === 'success' ? <Check size={15} color={colors.good} strokeWidth={2.4} /> : null}
          {status.kind === 'error' ? <X size={15} color={colors.bad} strokeWidth={2.4} /> : null}
          <T variant="label" color={status.kind === 'success' ? colors.good : status.kind === 'error' ? colors.bad : colors.inkMuted}>
            {status.text}
          </T>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: { gap: 6 },
  optional: { fontFamily: fonts.bodySemi, fontSize: 12 },
  box: { minHeight: size.field, borderRadius: radii.field, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6 },
  multi: { alignItems: 'flex-start', paddingVertical: 14, minHeight: 76 },
  prefix: { fontFamily: fonts.bodySemi, fontSize: 16 },
  input: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  inputMulti: { textAlignVertical: 'top', minHeight: 48 },
  help: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
