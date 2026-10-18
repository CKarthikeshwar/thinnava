import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardPaste, Heart, X } from 'lucide-react-native';
import { Pressable, T } from '@/components';
import { notificationsPage } from '@/features/notifications/api';
import { NotifRow, useAnswerRequest } from '@/features/notifications/NotifRow';
import { myWishlist } from '@/features/visits/api';
import { pasteMessage } from '@/features/import/paste';
import { PASTE_TEXT } from '@/features/import/clipboard';
import { colors, fonts, radii, shadows, space } from '@/theme';

/** A white box in the laptop Home side column, with a Fredoka heading and an optional link on the right. */
function Box({ title, link, onLink, children }: { title: string; link?: string; onLink?: () => void; children: ReactNode }) {
  return (
    <View style={styles.box}>
      <View style={styles.boxHead}>
        <T style={styles.boxTitle} accessibilityRole="header">{title}</T>
        {link ? <T style={styles.boxLink} onPress={onLink} accessibilityRole="link">{link}</T> : null}
      </View>
      {children}
    </View>
  );
}

/** Laptop Home side column (spec §18.3): paste box → notifications → wishlist. */
export function HomeSide() {
  return (
    <View style={styles.side}>
      <View style={styles.drop}>
        <T style={styles.dropTitle}>Got a tip from a friend?</T>
        <T variant="card" style={{ lineHeight: 22 }}>
          Copy their WhatsApp message and press <T style={styles.key}>Ctrl</T> + <T style={styles.key}>V</T> anywhere on this page. We'll read it and fill in the place for you.
        </T>
        <Pressable onPress={pasteMessage} pressScale={0.97} style={styles.dropBtn} accessibilityRole="button" accessibilityLabel="Paste a message">
          <ClipboardPaste size={17} color={colors.onPrimaryContainer} strokeWidth={2} />
          <T style={styles.dropBtnText}>Paste a message</T>
        </Pressable>
      </View>
      <NotificationsBox />
      <WishlistBox />
    </View>
  );
}

/** Newest three notifications; reading them here doesn't mark them read (only F1 does). */
function NotificationsBox() {
  const list = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsPage() });
  const { busy, answer } = useAnswerRequest();
  const rows = (list.data ?? []).slice(0, 3);
  return (
    <Box title="Notifications" link="See all" onLink={() => router.push('/notifications')}>
      {list.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 12 }} /> : null}
      {list.data && !rows.length ? <T variant="card" style={styles.empty}>Nothing yet. Requests and tags show up here.</T> : null}
      <View style={styles.bleed}>
        {rows.map((n) => <NotifRow key={n.id} n={n} busy={busy === n.id} onAnswer={(a) => answer(n, a)} />)}
      </View>
    </Box>
  );
}

function WishlistBox() {
  const list = useQuery({ queryKey: ['myWishlist'], queryFn: myWishlist });
  const rows = (list.data ?? []).slice(0, 3);
  const total = list.data?.length ?? 0;
  return (
    <Box title="Your wishlist" link={total > 3 ? `See all ${total}` : total ? 'See all' : undefined}
      onLink={() => router.navigate({ pathname: '/(tabs)/profile', params: { tab: 'wishlist' } })}>
      {list.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 12 }} /> : null}
      {list.data && !rows.length ? <T variant="card" style={styles.empty}>Tap ♡ on a place to save it for later.</T> : null}
      {rows.map((w, i) => (
        <Pressable key={w.place_id} onPress={() => router.push({ pathname: '/place/[placeId]', params: { placeId: w.place_id } })} pressScale={0.99}
          style={[styles.wish, i > 0 && styles.line]} accessibilityRole="link">
          <Heart size={15} color={colors.primary} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <T style={styles.wishName} numberOfLines={1}>{w.name}</T>
            {w.area ? <T variant="meta" numberOfLines={1}>{w.area}</T> : null}
          </View>
        </Pressable>
      ))}
    </Box>
  );
}

/** Phone browser Home (spec §18.3): the paste-first card at the top of the feed. ✕ hides it for 6 hours. */
export function PasteHero({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.hero}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T style={styles.heroTitle}>Got a tip from a friend?</T>
          <T style={styles.heroText}>Copy their WhatsApp message, then tap below. We'll read it and fill in the place.</T>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10} pressScale={0.9} accessibilityRole="button" accessibilityLabel="Not now">
          <X size={18} color={colors.onPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>
      <Pressable onPress={pasteMessage} pressScale={0.98} style={styles.heroBtn} accessibilityRole="button" accessibilityLabel={PASTE_TEXT.cardAction}>
        <ClipboardPaste size={18} color={colors.primaryStrong} strokeWidth={2.2} />
        <T style={styles.heroBtnText}>{PASTE_TEXT.cardAction}</T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  side: { gap: 16 },
  drop: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.dashed, borderRadius: 18, backgroundColor: colors.surfaceSoft, padding: 18, gap: 4 },
  dropTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  key: { fontFamily: fonts.bodyHeavy, fontSize: 11.5, color: colors.inkMuted, backgroundColor: colors.surface, borderWidth: 1, borderBottomWidth: 2, borderColor: colors.hairline, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  dropBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', height: 40, paddingHorizontal: 15, borderRadius: 12, backgroundColor: colors.primaryContainer, marginTop: 10 },
  dropBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.onPrimaryContainer },
  box: { backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, boxShadow: shadows.card },
  boxHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  boxTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  boxLink: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.primary },
  bleed: { marginHorizontal: -space.gutter },
  empty: { paddingVertical: 8 },
  wish: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  line: { borderTopWidth: 1, borderTopColor: colors.hairline },
  wishName: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.ink },
  hero: { backgroundColor: colors.primary, borderRadius: radii.panel - 2, padding: 16, gap: 12 },
  heroTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onPrimary },
  heroText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.onPrimary, opacity: 0.9, marginTop: 3 },
  heroBtn: { height: 48, borderRadius: 14, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15.5, color: colors.primaryStrong },
});
