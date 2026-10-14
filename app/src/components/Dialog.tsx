import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { colors, curves, durations, radii, useMotion } from '@/theme';
import { Button } from './Button';
import { T } from './T';

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  top?: ReactNode; // optional header visual (e.g. an avatar)
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirm dialog for things that can't be undone. Fades and scales from 90%, 200 ms. */
export function Dialog({ visible, title, body, top, confirmLabel, cancelLabel = 'Cancel', destructive, onConfirm, onCancel }: Props) {
  const { reduced } = useMotion();
  const enter = reduced ? FadeIn.duration(durations.short) : ZoomIn.duration(durations.dialog).easing(curves.decelerate.factory());
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(durations.dialog)} exiting={FadeOut.duration(durations.short)} style={styles.scrim}>
        <Animated.View entering={enter} style={styles.card} accessibilityRole="alert">
          {top}
          <T variant="title">{title}</T>
          {body ? <T variant="body" style={styles.body}>{body}</T> : null}
          <View style={styles.row}>
            <Button label={cancelLabel} variant="tonal" small onPress={onCancel} style={styles.btn} />
            <Button label={confirmLabel} small onPress={onConfirm} style={[styles.btn, destructive && { backgroundColor: colors.bad }]} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radii.sheet, padding: 22, gap: 4 },
  body: { marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btn: { alignSelf: 'auto', minWidth: 96 },
});
