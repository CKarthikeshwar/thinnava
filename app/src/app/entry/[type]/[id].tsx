import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ExternalLink, Heart, Lock, MoreVertical, Pencil, Trash2, UserMinus } from 'lucide-react-native';
import { Button, Dialog, IconButton, Panel, Pressable, ReviewPill, Sheet, SheetOption, T, TopBar, showSnack, type Rating } from '@/components';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CATEGORY_LABEL, type Category } from '@/features/places/api';
import { CategoryThumb } from '@/features/places/components';
import { deleteSaved, SAVED_KEYS, savedDetail } from '@/features/saved/api';
import { untagMe } from '@/features/notifications/api';
import { openPerson } from '@/features/people/components';
import { deleteVisit, entryDetail, ENTRY_KEYS, hideFromFeed, placePage, setWishlist } from '@/features/visits/api';
import { friendlyDate } from '@/lib/dates';
import { friendlyError } from '@/lib/errors';
import { dotJoin } from '@/lib/format';
import { colors, fonts, shadows, space } from '@/theme';

/** What C2 shows, for a visit or a saved (friend / internet) entry. */
type View_ = {
  kind: 'visit' | 'friend' | 'internet';
  id: string; isMine: boolean; title: string;
  placeId: string; placeName: string; placeArea: string | null; placeCategory: Category | null;
  rating: Rating | null; loved: string[]; disliked: string[]; price: number | null; date: string | null;
  companions: string[]; notes: string | null; createdAt: string; audience: string[] | null; link: string | null;
  /** Accepted tag partners (tappable) and my own tag on this visit, if any (§7). */
  people: { id: string; name: string }[]; myTag: { id: string; status: 'pending' | 'accepted' } | null;
};

async function load(type: string, id: string): Promise<View_ | null> {
  if (type === 'saved') {
    const s = await savedDetail(id);
    if (!s) return null;
    return {
      kind: s.type, id: s.id, isMine: true,
      title: s.type === 'friend' ? `${s.friend_name}'s experience` : 'Found online',
      placeId: s.place_id, placeName: s.place_name, placeArea: s.place_area, placeCategory: s.place_category,
      rating: s.rating, loved: s.loved, disliked: s.disliked, price: s.price_per_person, date: s.visited_on,
      companions: [], notes: null, createdAt: s.created_at, audience: null, link: s.source_url, people: [], myTag: null,
    };
  }
  const v = await entryDetail(type, id);
  if (!v) return null;
  return {
    kind: 'visit', id: v.id, isMine: v.is_mine, title: v.is_mine ? 'Your visit' : `${v.author_name.split(' ')[0]}'s visit`,
    placeId: v.place_id, placeName: v.place_name, placeArea: v.place_area, placeCategory: v.place_category,
    rating: v.rating, loved: v.loved, disliked: v.disliked, price: v.price_per_person, date: v.visited_on,
    companions: v.companions, notes: v.notes, createdAt: v.created_at, audience: v.audience, link: null,
    people: (v.tags ?? []).filter((t) => t.status === 'accepted').map((t) => ({ id: t.user_id, name: t.name })),
    myTag: v.my_tag ?? null,
  };
}

/**
 * C2 Entry detail (spec §14): the entry in full; Edit (owner) and Wishlist; ⋮ Delete for the owner.
 * Friend entries read "Rahul's experience" (never "review"); internet entries show "Open link".
 */
export default function EntryScreen() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['entry', type, id], queryFn: () => load(type, id) });
  const pp = useQuery({ queryKey: ['placePage', q.data?.placeId], queryFn: () => placePage(q.data!.placeId), enabled: !!q.data });
  const [confirm, setConfirm] = useState(false);
  const menu = useRef<BottomSheetModal>(null);

  if (q.isLoading || !q.data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar compact onBack={() => router.back()} />
        <View style={styles.center}>{q.isLoading ? <ActivityIndicator color={colors.primary} /> : <T variant="body">This entry isn't available.</T>}</View>
      </SafeAreaView>
    );
  }
  const e = q.data;
  const saved = e.kind !== 'visit';
  const onWishlist = !!pp.data?.on_wishlist;
  // The wishlist is for places I haven't been to (§9); wait for the place page so the button doesn't flash.
  const showWishlist = !!pp.data && (!pp.data.my_visits?.length || onWishlist);

  const refresh = () => Promise.all([...ENTRY_KEYS, ...SAVED_KEYS].map((k) => qc.invalidateQueries({ queryKey: k })));
  const toggleWishlist = async () => {
    try {
      await setWishlist(e.placeId, !onWishlist, e.placeName);
      await refresh();
      showSnack({ text: onWishlist ? 'Removed from your wishlist' : 'Added to your wishlist' });
    } catch (err) { showSnack({ text: friendlyError(err) }); }
  };
  const remove = async () => {
    setConfirm(false);
    try {
      const label = `Delete ${saved ? 'entry' : 'visit'} at ${e.placeName}`;
      const r = saved ? await deleteSaved(e.id, label) : await deleteVisit(e.id, label);
      if (r.queued) hideFromFeed(e.id); else await refresh();
      showSnack({ text: r.queued ? "Deleted · it'll sync when you're online" : saved ? 'Entry deleted' : 'Visit deleted' });
      router.back();
    } catch (err) { showSnack({ text: friendlyError(err, "Couldn't delete. Try again.") }); }
  };
  const removeMe = async () => {
    menu.current?.dismiss();
    if (!e.myTag) return;
    try { await untagMe(e.myTag.id); await refresh(); showSnack({ text: 'You were removed from this visit' }); }
    catch (err) { showSnack({ text: friendlyError(err) }); }
  };
  const edit = () => saved
    ? router.push({ pathname: '/saved/[id]/edit', params: { id: e.id } })
    : router.push({ pathname: '/visit/[id]/edit', params: { id: e.id } });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar compact title={e.title} onBack={() => router.back()}
        actions={e.isMine || e.myTag?.status === 'accepted' ? <IconButton icon={MoreVertical} label="More options" ghost onPress={() => menu.current?.present()} /> : undefined} />
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable onPress={() => router.push({ pathname: '/place/[placeId]', params: { placeId: e.placeId } })} pressScale={0.99}
          accessibilityRole="button" accessibilityLabel={`Open ${e.placeName}`}>
          <Panel style={styles.placeLink}>
            <CategoryThumb category={e.placeCategory} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" numberOfLines={1}>{e.placeName}</T>
              <T variant="meta" style={styles.sub} numberOfLines={1}>{dotJoin(e.placeArea, e.placeCategory && CATEGORY_LABEL[e.placeCategory])}</T>
            </View>
            <ChevronRight size={22} color={colors.inkMuted} strokeWidth={2} />
          </Panel>
        </Pressable>

        <Panel style={styles.panel}>
          {e.rating ? <ReviewPill rating={e.rating} big /> : null}
          <View style={[styles.facts, !e.rating && { marginTop: 0 }]}>
            {([
              ['Loved', e.loved.join(', ')],
              ["Didn't like", e.disliked.join(', ')],
              ['Price', e.price ? `₹${e.price} / person` : ''],
              ['Went on', e.date ? friendlyDate(e.date) : ''],
              ['With', e.companions.join(', ')],
              ['Notes', e.notes ?? ''],
            ] as const).filter(([, v]) => v).map(([label, value]) => (
              <View key={label} style={styles.fact}>
                <T style={styles.dt}>{label}</T>
                <T style={styles.dd}>{value}</T>
              </View>
            ))}
            {!e.rating && !e.loved.length && !e.disliked.length && !e.price && !e.date ? <T variant="meta">Nothing else was saved about it.</T> : null}
          </View>
        </Panel>
        {e.link ? (
          <Button label="Open link" variant="outline" icon={ExternalLink} small style={styles.link}
            onPress={() => Linking.openURL(e.link!).catch(() => showSnack({ text: "Couldn't open that link. Check it in your browser." }))} />
        ) : null}
        {e.people.length ? (
          <View style={styles.withRow}>
            <T variant="meta">Went with</T>
            {e.people.map((p) => (
              <Pressable key={p.id} onPress={() => openPerson(p.id)} accessibilityRole="button" accessibilityLabel={`Open ${p.name}'s profile`}>
                <T style={styles.withName}>{p.name}</T>
              </Pressable>
            ))}
          </View>
        ) : null}
        {e.isMine && (saved || e.audience) ? (
          <View style={styles.footer}>
            <Lock size={14} color={colors.inkMuted} strokeWidth={2} />
            <T variant="meta" style={{ flex: 1 }}>
              Logged by you {loggedOn(e.createdAt)} · {saved ? 'Only you can see this' : `Shared with ${e.audience!.join(', ')}`}
            </T>
          </View>
        ) : null}
      </ScrollView>
      {e.isMine || showWishlist ? <View style={styles.actions}>
        {e.isMine ? <Button label="Edit" variant={showWishlist ? 'tonal' : 'primary'} icon={Pencil} style={{ flex: 1 }} onPress={edit} /> : null}
        {showWishlist ? <Button label={onWishlist ? 'On wishlist' : 'Wishlist'} variant={onWishlist ? 'tonal' : 'primary'} icon={Heart} style={{ flex: 1 }} onPress={toggleWishlist} /> : null}
      </View> : null}

      <Sheet ref={menu}>
        {e.isMine ? (
          <SheetOption icon={Trash2} label={saved ? 'Delete entry' : 'Delete visit'} hint={saved ? "This can't be undone." : "It'll disappear for everyone you shared it with."}
            onPress={() => { menu.current?.dismiss(); setConfirm(true); }} />
        ) : null}
        {e.myTag?.status === 'accepted' ? (
          <SheetOption icon={UserMinus} label="Remove me from this visit" hint="Your own visit stays; the link goes from both." onPress={removeMe} />
        ) : null}
      </Sheet>
      <Dialog visible={confirm} icon={Trash2} destructive confirmLabel="Delete"
        title={saved ? 'Delete this entry?' : 'Delete this visit?'}
        body={saved ? "This can't be undone." : "It'll disappear for everyone you shared it with."}
        onCancel={() => setConfirm(false)} onConfirm={remove} />
    </SafeAreaView>
  );
}

/** "today" / "yesterday" / "on Oct 11" for the footer line. */
function loggedOn(createdAt: string) {
  const d = friendlyDate(createdAt.slice(0, 10));
  return d === 'Today' || d === 'Yesterday' ? d.toLowerCase() : `on ${d}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 14, paddingBottom: 24 },
  placeLink: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, boxShadow: shadows.card },
  sub: { fontSize: 13, marginTop: 2 },
  panel: { marginTop: 10, padding: 16, boxShadow: shadows.card },
  facts: { marginTop: 14, gap: 9 },
  fact: { flexDirection: 'row', gap: 10 },
  dt: { width: 96, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 20, color: colors.inkMuted, paddingTop: 1 },
  dd: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, lineHeight: 20, color: colors.ink },
  link: { alignSelf: 'flex-start', marginTop: 12, marginHorizontal: 4 },
  withRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12, marginHorizontal: 4 },
  withName: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.primary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 12 },
});
