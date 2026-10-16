import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Check, type LucideProps } from 'lucide-react-native';
import { colors, curves, durations, radii, shadows, space, useMotion } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

type Props = { title?: string; children: ReactNode; onDismiss?: () => void };

/**
 * Bottom sheet (DESIGN.md "Bottom Sheet"): white, 28 dp top corners, hairline handle, Fredoka title.
 * Open with ref.current?.present(), close with ref.current?.dismiss(). Rises in 400 ms over a fading scrim.
 */
export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet({ title, children, onDismiss }, ref) {
  const inner = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => inner.current as BottomSheetModal);
  const [open, setOpen] = useState(false);
  // Android back closes the sheet before leaving the screen.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { inner.current?.dismiss(); return true; });
    return () => sub.remove();
  }, [open]);
  const { d } = useMotion();
  const animationConfigs = useBottomSheetTimingConfigs({ duration: d(durations.sheetIn), easing: curves.decelerate });
  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={[p.style, { backgroundColor: colors.scrim }]} />,
    [],
  );
  return (
    <BottomSheetModal
      ref={inner}
      onChange={(i) => setOpen(i >= 0)}
      onDismiss={() => { setOpen(false); onDismiss?.(); }}
      backdropComponent={backdrop}
      animationConfigs={animationConfigs}
      enableDynamicSizing
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
      accessibilityLabel={title}
    >
      <BottomSheetView style={styles.body}>
        {title ? <T variant="title" style={styles.title} accessibilityRole="header">{title}</T> : null}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

type OptionProps = {
  icon?: ComponentType<LucideProps>;
  leading?: ReactNode;
  label: string;
  hint?: string;
  selected?: boolean;
  /** Square checkbox instead of a radio (multi-select). */
  check?: boolean;
  onPress?: () => void;
};

/** Sheet option row with a 40 dp mark, label, one-line hint and a trailing radio. */
export function SheetOption({ icon: Icon, leading, label, hint, selected, check, onPress }: OptionProps) {
  return (
    <Pressable onPress={onPress} pressScale={0.99} style={styles.opt} accessibilityRole={check ? 'checkbox' : 'radio'} accessibilityState={{ checked: !!selected }} accessibilityLabel={hint ? `${label}, ${hint}` : label}>
      {leading ?? (Icon ? (
        <View style={styles.mark}><Icon size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
      ) : null)}
      <View style={styles.optText}>
        <T variant="bodyStrong" style={styles.optLabel}>{label}</T>
        {hint ? <T variant="meta" style={styles.hint}>{hint}</T> : null}
      </View>
      {check ? <CheckBox on={!!selected} /> : <Radio on={!!selected} />}
    </Pressable>
  );
}

export function CheckBox({ on }: { on: boolean }) {
  return <View style={[styles.check, on && styles.checkOn]}>{on ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>;
}

export function Radio({ on }: { on: boolean }) {
  return <View style={[styles.radio, on ? styles.radioOn : styles.radioOff]} />;
}

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.surface, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, boxShadow: shadows.sheet },
  handle: { width: 36, height: 4, backgroundColor: colors.hairline },
  body: { paddingBottom: 30 },
  title: { paddingHorizontal: space.sheet, paddingTop: 4, paddingBottom: 12 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: space.sheet },
  mark: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  optText: { flex: 1 },
  optLabel: { fontFamily: 'Nunito_700Bold' },
  hint: { fontSize: 13, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11 },
  check: { width: 24, height: 24, borderRadius: 8, boxShadow: `inset 0px 0px 0px 2px ${colors.inkMuted}`, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, boxShadow: 'none' },
  radioOff: { boxShadow: `inset 0px 0px 0px 2px ${colors.inkMuted}` },
  radioOn: { backgroundColor: colors.primary, boxShadow: `inset 0px 0px 0px 2px ${colors.primary}, inset 0px 0px 0px 6px ${colors.surface}` },
});
