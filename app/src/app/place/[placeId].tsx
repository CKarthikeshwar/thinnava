import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { ChevronDown, Clock, Heart, ThumbsDown, IndianRupee, MapPin, MoreVertical, Navigation, Plus, Star, Store, UsersRound, Globe, Lock, UserRound, Phone } from 'lucide-react-native';
import { Avatar, IconButton, Panel, Pressable, ReviewPill, T, TopBar, showSnack } from '@/components';
import { ENTRY_KEYS, placePage, setWishlist } from '@/features/visits/api';
import { internetLabel } from '@/features/saved/labels';
import { openPerson } from '@/features/people/components';
import { friendlyDate } from '@/lib/dates';
import { friendlyError } from '@/lib/errors';
import { directionsUrl, open, swiggyUrl } from '@/features/handoff/urls';
import { CATEGORY_LABEL, getPlace, googleInfo, googleInfoMode, isClosed, isPractice, rememberPlace, type GoogleInfo } from '@/features/places/api';
import { dotJoin, priceMarks } from '@/lib/format';
import { colors, fonts, radii, shadows, space } from '@/theme';

/** C1 Place page (spec §14): people first; Google's rating/hours/price only on tap (§25.5); Directions + Swiggy. */
export default function PlacePage() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const place = useQuery({ queryKey: ['place', placeId], queryFn: () => getPlace(placeId), enabled: !!placeId });
  const mode = useQuery({ queryKey: ['googleMode'], queryFn: googleInfoMode, staleTime: 60 * 60_000 });
  const page = useQuery({ queryKey: ['placePage', placeId], queryFn: () => placePage(placeId), enabled: !!placeId });
  const qc = useQueryClient();

  useEffect(() => {
    if (place.data) rememberPlace({ placeId: place.data.placeId, name: place.data.name, area: place.data.area });
  }, [place.data?.placeId]);

  if (!place.data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar onBack={() => router.back()} />
        <View style={styles.center}>{place.error ? <T variant="body">Couldn't load this place.</T> : <ActivityIndicator color={colors.primary} />}</View>
      </SafeAreaView>
    );
  }
  const p = place.data;
  const closed = isClosed(p);
  const mine = page.data?.my_visits ?? [];
  const people = page.data?.people_visits ?? [];
  const onWishlist = !!page.data?.on_wishlist;
  const nobodyYet = !mine.length && !people.length;
  const toggleWishlist = async () => {
    try {
      await setWishlist(p.placeId, !onWishlist, p.name);
      await Promise.all(ENTRY_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
      showSnack(onWishlist ? { text: 'Removed from your wishlist' } : { text: 'Added to your wishlist', action: { label: 'Who sees it', onPress: () => router.push('/(tabs)/profile') } });
    } catch (e) { showSnack({ text: friendlyError(e) }); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar
        onBack={() => router.back()}
        actions={
          <>
            {/* No ♡ on a closed place (C1b) or one I've been to (§9); still shown if it's already on the wishlist so it can be removed. */}
            {(!closed && !mine.length) || onWishlist ? <IconButton icon={Heart} label={onWishlist ? 'Remove from wishlist' : 'Add to wishlist'} active={onWishlist} onPress={toggleWishlist} /> : null}
            <IconButton icon={MoreVertical} label="More" ghost onPress={() => open(directionsUrl(p.name, p.placeId))} />
          </>
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          {closed ? (
            <View style={styles.closed}><Store size={16} color={colors.onPrimary} strokeWidth={2} /><T variant="label" color={colors.onPrimary}>Permanently closed</T></View>
          ) : null}
          <T variant="headline" style={closed && { color: colors.inkSoft }}>{p.name}</T>
          <T variant="meta" style={styles.meta}>{dotJoin(p.category && CATEGORY_LABEL[p.category], p.area)}</T>
          <GoogleInfoRow placeId={p.placeId} name={p.name} mode={mode.data ?? 'tap'} />
        </View>

        <View style={styles.acts}>
          <Act icon={<Navigation size={22} color={colors.primary} strokeWidth={2} />} label="Directions" onPress={() => open(directionsUrl(p.name, p.placeId))} />
          {!closed ? <Act icon={<SwiggyMark />} label="Swiggy" onPress={() => open(swiggyUrl(p.name))} /> : null}
        </View>

        {closed && !nobodyYet ? (
          <T variant="body" style={styles.pad}>What people said is still here. Swiggy is hidden; Directions stays.</T>
        ) : null}

        {mine.length ? (
          <Panel style={styles.panel}>
            <T variant="title" style={styles.secTitle}>Your visits</T>
            <View style={styles.hist}>
              {mine.map((v) => (
                <Pressable key={v.id} onPress={() => router.push({ pathname: '/entry/[type]/[id]', params: { type: 'visit', id: v.id } })} style={styles.histChip}
                  accessibilityRole="button" accessibilityLabel={`${friendlyDate(v.visited_on)}, ${v.rating}`}>
                  <T style={styles.histText}>{friendlyDate(v.visited_on)} </T>
                  <T style={[styles.histText, { fontFamily: fonts.bodyHeavy, color: v.rating === 'good' ? colors.good : v.rating === 'okayish' ? colors.okayish : colors.bad }]}>
                    {v.rating === 'good' ? 'Good' : v.rating === 'okayish' ? 'Okayish' : 'Bad'}
                  </T>
                </Pressable>
              ))}
            </View>
          </Panel>
        ) : null}

        {people.length ? (
          <Panel style={styles.panel}>
            <T variant="title" style={styles.secTitle}>People who've been</T>
            {people.map((v, i) => (
              <Pressable key={v.id} onPress={() => router.push({ pathname: '/entry/[type]/[id]', params: { type: v.entry_type === 'visit' ? 'visit' : 'saved', id: v.id } })}
                style={[styles.person, i > 0 && styles.personDivider]} accessibilityRole="button"
                accessibilityLabel={`${v.entry_type === 'visit' ? v.author_name : v.entry_type === 'friend' ? `${v.friend_name} told you` : internetLabel(v.source_url)}${v.rating ? `, ${v.rating}` : ''}`}>
                {/* Avatar and name open the person (§14 C1): the author, or the account a friend name is linked to. */}
                <Pressable onPress={personId(v) ? () => openPerson(personId(v)!) : undefined} disabled={!personId(v)} hitSlop={6}
                  accessible={!!personId(v)} accessibilityRole="button" accessibilityLabel={`Open ${v.entry_type === 'visit' ? (v.author_name ?? '').split(' ')[0] : v.friend_name}'s profile`}>
                  {v.entry_type === 'visit' ? <Avatar name={v.author_name ?? '?'} uri={v.author_avatar} />
                    : <View style={styles.src}>{v.entry_type === 'friend' ? <UserRound size={20} color={colors.primaryStrong} strokeWidth={2} /> : <Globe size={20} color={colors.primaryStrong} strokeWidth={2} />}</View>}
                </Pressable>
                <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                  <View style={styles.personHead}>
                    {v.entry_type === 'visit' ? (
                      <T style={styles.pn} numberOfLines={1}><T style={[styles.pn, styles.pnName]} onPress={personId(v) ? () => openPerson(personId(v)!) : undefined}>{(v.author_name ?? '').split(' ')[0]}</T>{v.companions.length ? ` with ${v.companions.join(', ')}` : ''}</T>
                    ) : v.entry_type === 'friend' ? (
                      <T style={styles.pn} numberOfLines={1}><T style={[styles.pn, styles.pnName]} onPress={personId(v) ? () => openPerson(personId(v)!) : undefined}>{v.friend_name}</T> told you</T>
                    ) : (
                      <T style={[styles.pn, styles.pnName]} numberOfLines={1}>{internetLabel(v.source_url)}</T>
                    )}
                    {v.rating ? <ReviewPill rating={v.rating} /> : null}
                  </View>
                  {v.loved.length ? <View style={styles.dish}><Heart size={15} color={colors.primary} strokeWidth={2} /><T style={styles.pl}>{v.loved.join(', ')}</T></View> : null}
                  {v.disliked.length ? <View style={styles.dish}><ThumbsDown size={15} color={colors.inkMuted} strokeWidth={2} /><T style={styles.pl}>{v.disliked.join(', ')}</T></View> : null}
                  {v.price_per_person || v.visited_on ? <T style={styles.plMuted}>{dotJoin(v.price_per_person ? `₹${v.price_per_person} / person` : null, v.visited_on ? friendlyDate(v.visited_on) : null)}</T> : null}
                  {v.entry_type !== 'visit' ? <View style={styles.dish}><Lock size={13} color={colors.inkMuted} strokeWidth={2} /><T style={styles.plMuted}>Only you</T></View> : null}
                </View>
              </Pressable>
            ))}
          </Panel>
        ) : null}

        {nobodyYet ? (
          <>
            <Panel style={[styles.panel, { paddingVertical: 16 }]}>
              <View style={styles.rowGap}>
                <View style={styles.src}><UsersRound size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">Nobody you know has been yet</T>
                  <T variant="meta">Here's what Google says.</T>
                </View>
              </View>
            </Panel>
            {p.address ? (
              <Panel style={[styles.panel, { paddingVertical: 8 }]}>
                <View style={styles.grow}><Bubble><MapPin size={18} color={colors.primaryStrong} strokeWidth={2} /></Bubble><T variant="body" color={colors.ink} style={{ flex: 1 }}>{p.address}</T></View>
              </Panel>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <Pressable style={styles.fab} onPress={() => router.push({ pathname: '/visit/new', params: { placeId: p.placeId } })} accessibilityRole="button" accessibilityLabel="Add visit">
        <Plus size={22} color={colors.onPrimary} strokeWidth={2.2} />
        <T style={styles.fabText}>Add visit</T>
      </Pressable>
    </SafeAreaView>
  );
}

/** Google's rating / hours / price, loaded only when tapped. In "off" mode it opens Google Maps instead (§25.5). */
type PersonRow = { entry_type: string; author_id?: string; friend_user_id?: string | null };
/** The account a "People who've been" row belongs to, if any. */
function personId(v: PersonRow) {
  return v.entry_type === 'visit' ? v.author_id : v.entry_type === 'friend' ? v.friend_user_id ?? undefined : undefined;
}

function useGoogleInfo(placeId: string) {
  const [asked, setAsked] = useState(false);
  const q = useQuery({ queryKey: ['placeGoogle', placeId], queryFn: () => googleInfo(placeId), enabled: asked, staleTime: 24 * 60 * 60_000 });
  return { asked, ask: () => setAsked(true), q };
}

function GoogleInfoRow({ placeId, name, mode }: { placeId: string; name: string; mode: 'tap' | 'off' }) {
  const { asked, ask, q } = useGoogleInfo(placeId);
  if (mode === 'off') {
    return <Pressable onPress={() => open(directionsUrl(name, placeId))} style={styles.gRow} accessibilityRole="link"><T variant="label">See hours on Google Maps</T></Pressable>;
  }
  if (asked && q.data?.info) return <View style={{ marginTop: 10 }}><InfoRows info={q.data.info} practice={!!q.data.practice} compact /></View>;
  return (
    <Pressable onPress={ask} style={styles.gRow} accessibilityRole="button" accessibilityLabel="More info: hours, phone, website">
      <Star size={16} color={colors.primary} strokeWidth={2} />
      <T style={styles.gTitle}>More info</T>
      <T variant="meta">{asked ? 'Loading…' : 'hours, phone, website'}</T>
      <ChevronDown size={16} color={colors.inkMuted} strokeWidth={2} />
    </Pressable>
  );
}

function InfoRows({ info, practice, compact }: { info: GoogleInfo; practice: boolean; compact?: boolean }) {
  const price = priceMarks(info.priceLevel);
  return (
    <View>
      {info.rating != null ? (
        <View style={styles.grow}><Bubble><Star size={18} color={colors.primaryStrong} strokeWidth={2} /></Bubble>
          <View><T variant="body" color={colors.ink}>{info.rating} on Ola Maps</T>{info.userRatingCount ? <T variant="meta">{info.userRatingCount.toLocaleString('en-IN')} reviews</T> : null}</View></View>
      ) : null}
      {info.hours.length ? (
        <View style={styles.grow}><Bubble><Clock size={18} color={colors.primaryStrong} strokeWidth={2} /></Bubble>
          <View style={{ flex: 1 }}>
            {info.openNow != null ? <T variant="body" color={info.openNow ? colors.good : colors.bad}>{info.openNow ? 'Open now' : 'Closed now'}</T> : null}
            {(compact ? info.hours.slice(0, 1) : info.hours).map((h) => <T key={h} variant="meta">{h}</T>)}
          </View></View>
      ) : null}
      {price ? <View style={styles.grow}><Bubble><IndianRupee size={18} color={colors.primaryStrong} strokeWidth={2} /></Bubble><T variant="body" color={colors.ink}>Price level {price}</T></View> : null}
      {info.phone ? (
        <Pressable onPress={() => open(`tel:${info.phone!.replace(/[^\d+]/g, '')}`)} style={styles.grow} accessibilityRole="link" accessibilityLabel={`Call ${info.phone}`}>
          <Bubble><Phone size={18} color={colors.primaryStrong} strokeWidth={2} /></Bubble><T variant="body" color={colors.primary}>{info.phone}</T>
        </Pressable>
      ) : null}
      {info.website && /^https?:\/\//i.test(info.website) ? (
        <Pressable onPress={() => open(info.website!)} style={styles.grow} accessibilityRole="link" accessibilityLabel="Open website">
          <Bubble><Globe size={18} color={colors.primaryStrong} strokeWidth={2} /></Bubble><T variant="body" color={colors.primary} numberOfLines={1} style={{ flex: 1 }}>{info.website.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}</T>
        </Pressable>
      ) : null}
      {info.rating == null && !info.hours.length && !price && !info.phone && !info.website ? <T variant="meta" style={styles.practice}>Ola Maps has no extra details for this place yet.</T> : null}
      {practice ? <T variant="meta" style={styles.practice}>Practice data</T> : <T variant="meta" style={styles.practice}>From Ola Maps</T>}
    </View>
  );
}

function Act({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.act} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.actIcon}>{icon}</View>
      <T variant="label" style={styles.actLabel}>{label}</T>
    </Pressable>
  );
}

const Bubble = ({ children }: { children: React.ReactNode }) => <View style={styles.bubble}>{children}</View>;

/** Swiggy's mark in cobalt on a white tile (owner's call; phase2 C1 mockup). */
function SwiggyMark() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path fill={colors.primary} d="M12.034 24c-.376-.411-2.075-2.584-3.95-5.513-.547-.916-.901-1.63-.833-1.814.178-.48 3.355-.743 4.333-.308.298.132.29.307.29.409 0 .44-.022 1.619-.022 1.619a.441.441 0 1 0 .883-.002l-.005-2.939c0-.255-.278-.319-.331-.329-.511-.002-1.548-.006-2.661-.006-2.457 0-3.006.101-3.423-.172-.904-.591-2.383-4.577-2.417-6.819C3.849 4.964 5.723 2.225 8.362.868A8.13 8.13 0 0 1 12.026 0c4.177 0 7.617 3.153 8.075 7.209l.001.011c.084.981-5.321 1.189-6.39.904-.164-.044-.206-.212-.206-.284L13.5 4.996a.442.442 0 0 0-.884.002l.009 3.866a.33.33 0 0 0 .268.32l3.354-.001c1.79 0 2.542.207 3.042.588.333.254.461.739.349 1.37C18.633 16.755 12.273 23.71 12.034 24z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingBottom: 120 },
  hero: { paddingHorizontal: space.gutter, gap: 2 },
  meta: { marginTop: 6, fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkSoft },
  closed: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 12, height: 30, marginBottom: 10 },
  gRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, alignSelf: 'flex-start', height: 40, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1px ${colors.hairline}` },
  gTitle: { fontFamily: fonts.bodyHeavy, fontSize: 13.5, color: colors.inkSoft },
  acts: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 14 },
  act: { width: 78, alignItems: 'center', gap: 6 },
  actIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 1px 2px rgba(20,30,50,0.06), 0px 8px 18px -12px rgba(20,30,50,0.35)' },
  actLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.inkSoft },
  pad: { paddingHorizontal: space.gutter },
  panel: { marginHorizontal: 14, marginBottom: 10, paddingVertical: 4, paddingHorizontal: 16, boxShadow: shadows.card },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  src: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  grow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  bubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  practice: { marginTop: 6, fontStyle: 'italic' },
  secTitle: { fontSize: 16, lineHeight: 20, paddingTop: 8, paddingBottom: 6 },
  hist: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2, paddingBottom: 12 },
  histChip: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1px ${colors.hairline}` },
  histText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkSoft },
  person: { flexDirection: 'row', gap: 12, paddingVertical: 12, marginHorizontal: -16, paddingHorizontal: 16 },
  pn: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  pnName: { fontFamily: fonts.bodyHeavy, color: colors.ink },
  pl: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18, color: colors.inkSoft },
  plMuted: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.inkMuted },
  personDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dish: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 28, height: 56, borderRadius: radii.fab, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 20, boxShadow: `0px 10px 22px -10px ${colors.primaryStrong}` },
  fabText: { fontFamily: fonts.bodyHeavy, fontSize: 15.5, color: colors.onPrimary },
});
