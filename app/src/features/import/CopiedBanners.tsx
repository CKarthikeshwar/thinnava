import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Clipboard as ClipIcon, X } from 'lucide-react-native';
import { Button, IconButton, Pressable, T } from '@/components';
import { colors, fonts, radii, shadows, space } from '@/theme';
import { PASTE_TEXT } from './clipboard';

const PEEK = require('../../../assets/images/cat-peek.png');

/**
 * D5 "Use copied text?" chip (spec §10.4, phase2 D5 mockup). No preview: the text is read only when Use is tapped,
 * so Android's "pasted from clipboard" notice appears only then (§10.0).
 */
export function UseCopiedBanner({ onUse }: { onUse: () => void }) {
  return (
    <Pressable onPress={onUse} pressScale={0.98} style={styles.clip} accessibilityRole="button" accessibilityLabel={`${PASTE_TEXT.chipTitle} Reads what you copied`}>
      <ClipIcon size={20} color={colors.onPrimary} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <T style={styles.clipTitle}>{PASTE_TEXT.chipTitle}</T>
        <T style={styles.clipSub} numberOfLines={1}>{PASTE_TEXT.chipSub}</T>
      </View>
      <T style={styles.clipUse}>{PASTE_TEXT.chipAction}</T>
    </Pressable>
  );
}

/** B1 Home card "You copied a message" (spec §10.0, §14 B1): Read it opens the import; ✕ hides it for 6 hours. */
export function CopiedMessageCard({ onRead, onDismiss, title = PASTE_TEXT.cardTitle, sub = PASTE_TEXT.cardSub, action = PASTE_TEXT.cardAction }:
  { onRead: () => void; onDismiss: () => void; title?: string; sub?: string; action?: string }) {
  return (
    <View style={styles.card}>
      <Image source={PEEK} style={styles.cat} contentFit="contain" accessibilityElementsHidden />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={styles.cardTitle}>{title}</T>
        <T variant="meta" style={styles.cardSub}>{sub}</T>
        <Button label={action} small onPress={onRead} style={styles.read} />
      </View>
      <IconButton icon={X} label="Not now" ghost onPress={onDismiss} style={styles.close} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.gutter, marginBottom: 12, backgroundColor: colors.ink, borderRadius: radii.field, paddingVertical: 11, paddingHorizontal: 14 },
  clipTitle: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.onPrimary },
  clipSub: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: colors.onPrimary, opacity: 0.8 },
  clipUse: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.primaryContainer, paddingLeft: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: 12, paddingLeft: 12, paddingRight: 4, boxShadow: shadows.card },
  cat: { width: 64, height: 54 },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  cardSub: { fontSize: 13.5 },
  read: { alignSelf: 'flex-start', marginTop: 8, height: 38 },
  close: { alignSelf: 'flex-start' },
});
