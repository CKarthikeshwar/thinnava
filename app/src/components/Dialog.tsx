import type { ComponentType, ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { colors, curves, durations, fonts, radii, useMotion } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  /** 44 dp tinted circle above the title (D10 trash, A7 location). */
  icon?: ComponentType<LucideProps>;
  /** Red icon circle (E9 Block mockup); default is the pale-cobalt circle (D10, A7). */
  iconDanger?: boolean;
  top?: ReactNode; // optional header visual (e.g. an avatar)
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirm dialog for things that can't be undone (phase2 D10 / A7 mockups): optional icon circle,
 * Fredoka title, body, then text buttons on the right. Destructive confirm is red text;
 * otherwise the confirm is a filled pill. Fades and scales from 90%, 200 ms.
 */
export function Dialog({ visible, title, body, icon: Icon, iconDanger, top, confirmLabel, cancelLabel = 'Cancel', destructive, onConfirm, onCancel }: Props) {
  const { reduced } = useMotion();
  const enter = reduced ? FadeIn.duration(durations.short) : ZoomIn.duration(durations.dialog).easing(curves.decelerate.factory());
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(durations.dialog)} exiting={FadeOut.duration(durations.short)} style={styles.scrim}>
        <Animated.View entering={enter} style={styles.card} accessibilityRole="alert">
          {Icon ? <View style={[styles.icon, iconDanger && { backgroundColor: colors.badWash }]}><Icon size={22} color={iconDanger ? colors.bad : colors.primaryStrong} strokeWidth={2} /></View> : null}
          {top}
          <T variant="title">{title}</T>
          {body ? <T variant="body" style={styles.body}>{body}</T> : null}
          <View style={styles.row}>
            <TextButton label={cancelLabel} onPress={onCancel} />
            {destructive
              ? <TextButton label={confirmLabel} color={colors.bad} onPress={onConfirm} />
              : <TextButton label={confirmLabel} strong onPress={onConfirm} />}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function TextButton({ label, onPress, color = colors.primary, strong }: { label: string; onPress: () => void; color?: string; strong?: boolean }) {
  return (
    <Pressable onPress={onPress} pressScale={0.96} style={[styles.tbtn, strong && styles.strong]} accessibilityRole="button" accessibilityLabel={label}>
      <T style={styles.tlabel} color={strong ? colors.onPrimary : color}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radii.sheet, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 14, boxShadow: '0px 24px 50px -20px rgba(0,0,0,0.45)' },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  body: { marginTop: 8, fontSize: 14.5, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 18 },
  tbtn: { height: 44, paddingHorizontal: 14, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  strong: { backgroundColor: colors.primary, paddingHorizontal: 20 },
  tlabel: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
});
