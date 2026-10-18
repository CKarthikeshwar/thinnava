import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Heart, Lock, MapPin, ThumbsDown } from 'lucide-react-native';
import { colors, curves, radii, shadows, useMotion } from '@/theme';
import { Avatar, SourceMark } from './Avatar';
import { Pressable } from './Pressable';
import { ReviewPill, type Rating } from './ReviewPill';
import { T } from './T';

export type EntryCardProps = {
  /** visit = a person's own visit; friend = a friend's experience I saved; internet = an internet find. */
  kind: 'visit' | 'friend' | 'internet';
  /** Header line: bold name (tappable) + the rest, e.g. {name:'Ananya', text:'went to'}, or just {text:'From a reel'}. */
  who: { name?: string; text: string; avatarUri?: string | null };
  /** Full name for the avatar initials when the header says "You". */
  avatarName?: string;
  place: string;
  /** Meta after the pin icon: "Indiranagar · with Arjun", "Koramangala · went Oct 10". */
  meta?: string;
  time: string; // "2h", "1d"
  loved?: string[];
  disliked?: string[];
  rating?: Rating | null;
  pricePerPerson?: number | null;
  isPrivate?: boolean;
  onPress?: () => void;
  /** Avatar / mark and name open that person's profile (spec §14 B1). Omitted when there's no account to open. */
  onPressPerson?: () => void;
  /** Just saved: starts tinted Pale Cobalt and fades to white (DESIGN.md "Share import"). */
  fresh?: boolean;
  onFreshDone?: () => void;
  /** Laptop web: small actions shown on the card while the mouse is over it (spec §18.3). */
  hoverActions?: ReactNode;
};

/** Pale Cobalt wash under the card's content that fades out after the card lands. */
function FreshTint({ onDone }: { onDone?: () => void }) {
  const { d } = useMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withDelay(d(400), withTiming(0, { duration: d(900), easing: curves.standard }, (ok) => { if (ok && onDone) runOnJS(onDone)(); }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fresh, style]} />;
}

/** Home timeline card (DESIGN.md "Entry card"). Leads with who and where; verdict in the footer. */
export function EntryCard(p: EntryCardProps) {
  const [hovered, setHovered] = useState(false);
  const label = [[p.who.name, p.who.text].filter(Boolean).join(' '), p.place, p.rating ? `Rating ${p.rating}` : null].filter(Boolean).join(', ');
  return (
    <Pressable onPress={p.onPress} pressScale={0.985} style={styles.card} accessibilityRole="button" accessibilityLabel={label}
      onHoverIn={p.hoverActions ? () => setHovered(true) : undefined} onHoverOut={p.hoverActions ? () => setHovered(false) : undefined}>
      {p.fresh ? <FreshTint onDone={p.onFreshDone} /> : null}
      <View style={styles.top}>
        <Pressable onPress={p.onPressPerson} disabled={!p.onPressPerson} hitSlop={6}
          accessibilityRole={p.onPressPerson ? 'button' : undefined} accessibilityLabel={p.onPressPerson ? `Open ${p.who.name}'s profile` : undefined}>
          {p.kind === 'visit' ? (
            <Avatar name={p.avatarName ?? p.who.name ?? 'You'} uri={p.who.avatarUri} />
          ) : (
            <SourceMark kind={p.kind} />
          )}
        </Pressable>
        <View style={styles.head}>
          <T variant="card" numberOfLines={1}>
            {p.who.name ? (
              <T variant="card" style={styles.name} onPress={p.onPressPerson}>{p.who.name} </T>
            ) : null}
            {p.who.text}
          </T>
          <T variant="place" numberOfLines={2} style={styles.place}>{p.place}</T>
          {p.meta ? (
            <View style={styles.meta}>
              <MapPin size={13} color={colors.inkMuted} strokeWidth={2} />
              <T variant="meta" numberOfLines={1} style={styles.flex}>{p.meta}</T>
            </View>
          ) : null}
        </View>
        <T variant="meta" style={styles.time}>{p.time}</T>
      </View>

      {(p.loved?.length || p.disliked?.length) ? (
        <View style={styles.lines}>
          {p.loved?.length ? (
            <View style={styles.line} accessibilityLabel={`Loved: ${p.loved.join(', ')}`}>
              <Heart size={16} color={colors.primary} strokeWidth={2} style={styles.lineIcon} />
              <T variant="card" style={styles.flex}>{p.loved.join(', ')}</T>
            </View>
          ) : null}
          {p.disliked?.length ? (
            <View style={styles.line} accessibilityLabel={`Didn't like: ${p.disliked.join(', ')}`}>
              <ThumbsDown size={16} color={colors.inkMuted} strokeWidth={2} style={styles.lineIcon} />
              <T variant="card" style={styles.flex}>{p.disliked.join(', ')}</T>
            </View>
          ) : null}
        </View>
      ) : null}

      {(p.rating || p.pricePerPerson || p.isPrivate) ? (
        <View style={styles.foot}>
          {p.rating ? <ReviewPill rating={p.rating} /> : null}
          {p.pricePerPerson ? <T variant="price">₹{p.pricePerPerson} / person</T> : null}
          {p.isPrivate ? (
            <View style={styles.priv}>
              <Lock size={13} color={colors.inkMuted} strokeWidth={2} />
              <T variant="label" color={colors.inkMuted}>Only you</T>
            </View>
          ) : null}
        </View>
      ) : null}
      {hovered && p.hoverActions ? <View style={styles.hover}>{p.hoverActions}</View> : null}
    </Pressable>
  );
}

const INDENT = 51; // align lines under the name, past the 40 dp avatar

const styles = StyleSheet.create({
  hover: { position: 'absolute', right: 12, bottom: 11, flexDirection: 'row', gap: 6 },
  fresh: { backgroundColor: colors.primaryContainer, borderRadius: radii.card },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 13, boxShadow: shadows.card },
  top: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  head: { flex: 1, minWidth: 0 },
  name: { fontFamily: 'Nunito_800ExtraBold', color: colors.ink },
  place: { marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  time: { fontFamily: 'Nunito_700Bold', fontSize: 12 },
  lines: { marginTop: 10, marginLeft: INDENT, gap: 5 },
  line: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  lineIcon: { marginTop: 1 },
  foot: { marginTop: 11, marginLeft: INDENT, flexDirection: 'row', gap: 8, alignItems: 'center' },
  priv: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
});
