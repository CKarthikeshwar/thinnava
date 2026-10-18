import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Navigation, UserRound, Globe } from 'lucide-react-native';
import { Avatar, Button, IconButton, ReviewPill, T, showSnack, type Rating } from '@/components';
import { CATEGORY_LABEL } from '@/features/places/api';
import { internetLabel } from '@/features/saved/labels';
import { ENTRY_KEYS, placePage, setWishlist, type PlacePageData } from '@/features/visits/api';
import { directionsUrl, open } from '@/features/handoff/urls';
import { friendlyError } from '@/lib/errors';
import { useAuth } from '@/features/auth/session';
import { dotJoin } from '@/lib/format';
import { colors, fonts, space } from '@/theme';
import type { MapPlace } from './api';

type Line = { key: string; who: string; text: string; rating: Rating | null; avatar?: { name: string; uri: string | null }; glyph?: 'friend' | 'internet' };

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "loved the chicken burger", else "didn't like the fries", else nothing (just the pill). */
const said = (loved: string[], disliked: string[]) =>
  loved[0] ? ` loved the ${lower(loved[0])}` : disliked[0] ? ` didn't like the ${lower(disliked[0])}` : '';

/** Up to 3 one-line summaries from what I can see there (spec §14 B2b). */
function lines(page: PlacePageData, me?: { name: string; uri: string | null }): Line[] {
  const out: Line[] = page.people_visits.slice(0, 3).map((v) => v.entry_type === 'visit'
    ? { key: v.id, who: (v.author_name ?? '').split(' ')[0], text: said(v.loved, v.disliked), rating: v.rating, avatar: { name: v.author_name ?? '?', uri: v.author_avatar ?? null } }
    : v.entry_type === 'friend'
      ? { key: v.id, who: v.friend_name ?? '', text: said(v.loved, v.disliked), rating: v.rating, glyph: 'friend' }
      : { key: v.id, who: internetLabel(v.source_url ?? null), text: v.loved[0] ? ` · ${v.loved[0]}` : '', rating: v.rating, glyph: 'internet' });
  const mine = page.my_visits[0];
  if (mine && out.length < 3) out.unshift({ key: 'me', who: 'You', text: ' went', rating: mine.rating, ...(me ? { avatar: me } : {}) });
  return out.slice(0, 3);
}

/** B2b pin card body: place, who's been in one line each, ♡ (unvisited places only, §9), Open place and Directions. */
export function PinCard({ place, onClose }: { place: MapPlace; onClose: () => void }) {
  const qc = useQueryClient();
  const profile = useAuth((s) => s.profile);
  const page = useQuery({ queryKey: ['placePage', place.place_id], queryFn: () => placePage(place.place_id) });
  const onWishlist = !!page.data?.on_wishlist;
  const showHeart = !!page.data && (!page.data.my_visits.length || onWishlist);
  const toggle = async () => {
    try {
      await setWishlist(place.place_id, !onWishlist, place.name);
      await Promise.all([...ENTRY_KEYS, ['map']].map((k) => qc.invalidateQueries({ queryKey: k })));
      showSnack({ text: onWishlist ? 'Removed from your wishlist' : 'Added to your wishlist' });
    } catch (e) { showSnack({ text: friendlyError(e) }); }
  };
  return (
    <View style={styles.body}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T style={styles.name} numberOfLines={2}>{place.name}</T>
          <T variant="meta" style={styles.sub}>{dotJoin(place.area, place.category && CATEGORY_LABEL[place.category])}</T>
        </View>
        {showHeart ? <IconButton icon={Heart} label={onWishlist ? 'Remove from wishlist' : 'Add to wishlist'} active={onWishlist} onPress={toggle} /> : null}
      </View>
      {page.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
      {page.data ? (
        <View style={styles.lines}>
          {lines(page.data, profile ? { name: profile.display_name, uri: profile.avatar_url } : undefined).map((l) => (
            <View key={l.key} style={styles.line}>
              {l.avatar ? <Avatar name={l.avatar.name} uri={l.avatar.uri} size={32} />
                : <View style={styles.glyph}>{l.glyph === 'internet' ? <Globe size={17} color={colors.primaryStrong} strokeWidth={2} /> : <UserRound size={17} color={colors.primaryStrong} strokeWidth={2} />}</View>}
              <T style={styles.lineText} numberOfLines={2}><T style={styles.who}>{l.who}</T>{l.text}</T>
              {l.rating ? <ReviewPill rating={l.rating} /> : null}
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button label="Open place" style={{ flex: 1 }} onPress={() => { onClose(); router.push({ pathname: '/place/[placeId]', params: { placeId: place.place_id } }); }} />
        <Button label="Directions" variant="tonal" icon={Navigation} style={{ flex: 1 }} onPress={() => open(directionsUrl(place.name, place.place_id))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.gutter, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink },
  sub: { marginTop: 2 },
  lines: { gap: 10, marginTop: 14 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glyph: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  lineText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  who: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
