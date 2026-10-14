import { StyleSheet, View } from 'react-native';
import { Heart, Lock, MapPin, ThumbsDown } from 'lucide-react-native';
import { colors, radii, shadows } from '@/theme';
import { Avatar, SourceMark } from './Avatar';
import { Pressable } from './Pressable';
import { ReviewPill, type Rating } from './ReviewPill';
import { T } from './T';

export type EntryCardProps = {
  /** visit = a person's own visit; friend = a friend's experience I saved; internet = an internet find. */
  kind: 'visit' | 'friend' | 'internet';
  /** Header line: bold name (tappable) + the rest, e.g. {name:'Ananya', text:'went to'}, or just {text:'From a reel'}. */
  who: { name?: string; text: string; avatarUri?: string | null };
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
  onPressName?: () => void;
};

/** Home timeline card (DESIGN.md "Entry card"). Leads with who and where; verdict in the footer. */
export function EntryCard(p: EntryCardProps) {
  const label = [[p.who.name, p.who.text].filter(Boolean).join(' '), p.place, p.rating ? `Rating ${p.rating}` : null].filter(Boolean).join(', ');
  return (
    <Pressable onPress={p.onPress} pressScale={0.985} style={styles.card} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.top}>
        {p.kind === 'visit' ? (
          <Avatar name={p.who.name ?? 'You'} uri={p.who.avatarUri} />
        ) : (
          <SourceMark kind={p.kind} />
        )}
        <View style={styles.head}>
          <T variant="card" numberOfLines={1}>
            {p.who.name ? (
              <T variant="card" style={styles.name} onPress={p.onPressName}>{p.who.name} </T>
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
    </Pressable>
  );
}

const INDENT = 51; // align lines under the name, past the 40 dp avatar

const styles = StyleSheet.create({
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
