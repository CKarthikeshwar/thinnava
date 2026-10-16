import { useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Eye, Lock, Map as MapIcon, Palette, Pencil, Settings, Users, Globe, UserRound } from 'lucide-react-native';
import { Avatar, Button, Chip, IconButton, ListRow, Panel, Pressable, ReviewPill, Screen, Segmented, T, Thumb, TopBar, showSnack, type Rating } from '@/components';
import { useAuth } from '@/features/auth/session';
import type { Category } from '@/features/places/api';
import { CategoryThumb } from '@/features/places/components';
import { mySaved, SAVED_PAGE, type SavedKind } from '@/features/saved/api';
import { myRequests } from '@/features/people/api';
import { internetLabel } from '@/features/saved/labels';
import { AudienceSheet, audienceSummary } from '@/features/visits/AudienceSheet';
import { homeFeed, myCounts, myLists, myWishlist, myWishlistAudience, PAGE, setWishlistAudience } from '@/features/visits/api';
import { friendlyDate } from '@/lib/dates';
import { dotJoin } from '@/lib/format';
import { colors, fonts, space } from '@/theme';

type Tab = 'visited' | 'wishlist' | 'saved';
const TABS: { key: Tab; label: string }[] = [
  { key: 'visited', label: 'Visited' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'saved', label: 'Saved' },
];

type Row =
  | { kind: 'visit'; id: string; placeName: string; area: string | null; category: Category | null; rating: Rating | null; visitedOn: string | null }
  | { kind: 'wish'; id: string; placeName: string; area: string | null; category: Category | null }
  | { kind: 'saved'; id: string; placeName: string; sub: string; source: SavedKind; rating: Rating | null };

/** B5 My profile (spec §14): identity, counts, then Visited · Wishlist · Saved, 20 at a time. */
export default function Profile() {
  const profile = useAuth((s) => s.profile);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('visited');
  const [savedFilter, setSavedFilter] = useState<SavedKind | null>(null);
  const audienceRef = useRef<BottomSheetModal>(null);

  const counts = useQuery({ queryKey: ['myCounts'], queryFn: myCounts });
  const requests = useQuery({ queryKey: ['requests'], queryFn: myRequests });
  const incoming = (requests.data ?? []).filter((r) => r.direction === 'incoming').length;
  const visits = useInfiniteQuery({
    queryKey: ['feed', 'mine'],
    queryFn: ({ pageParam }) => homeFeed('mine', pageParam),
    initialPageParam: undefined as { created_at: string; id: string } | undefined,
    getNextPageParam: (last) => (last.length < PAGE ? undefined : { created_at: last[last.length - 1].created_at, id: last[last.length - 1].id }),
    enabled: tab === 'visited',
  });
  const saved = useInfiniteQuery({
    queryKey: ['mySaved', savedFilter],
    queryFn: ({ pageParam }) => mySaved(savedFilter, pageParam),
    initialPageParam: undefined as { created_at: string; id: string } | undefined,
    getNextPageParam: (last) => (last.length < SAVED_PAGE ? undefined : { created_at: last[last.length - 1].created_at, id: last[last.length - 1].id }),
    enabled: tab === 'saved',
  });
  const wishlist = useQuery({ queryKey: ['myWishlist'], queryFn: myWishlist, enabled: tab === 'wishlist' });
  const lists = useQuery({ queryKey: ['myLists'], queryFn: myLists, enabled: tab === 'wishlist' });
  const audience = useQuery({ queryKey: ['myWishlistAudience'], queryFn: myWishlistAudience, enabled: tab === 'wishlist' });
  const saveAudience = useMutation({
    mutationFn: setWishlistAudience,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myWishlistAudience'] }); showSnack({ text: 'Wishlist audience updated.' }); },
    onError: () => showSnack({ text: "Couldn't change who sees your wishlist. Try again." }),
  });

  const rows: Row[] =
    tab === 'visited'
      ? (visits.data?.pages.flat() ?? []).map((v) => ({ kind: 'visit', id: v.id, placeName: v.place_name, area: v.place_area, category: v.place_category, rating: v.rating, visitedOn: v.visited_on }))
      : tab === 'wishlist'
        ? (wishlist.data ?? []).map((w) => ({ kind: 'wish', id: w.place_id, placeName: w.name, area: w.area, category: w.category }))
        : (saved.data?.pages.flat() ?? []).map((s) => ({
            kind: 'saved', id: s.id, placeName: s.place_name, source: s.kind, rating: s.rating,
            sub: dotJoin(s.kind === 'friend' ? s.friend_name : internetLabel(s.source_url).replace(/^From an? /, '').replace(/^\w/, (c) => c.toUpperCase()), s.place_area),
          }));
  const active = tab === 'visited' ? visits : tab === 'wishlist' ? wishlist : saved;
  const mapSoon = () => showSnack({ text: 'The map arrives in M8.' });

  const header = (
    <View>
      <View style={styles.id}>
        <Pressable onPress={() => router.push('/settings/profile')} pressScale={0.97} accessibilityRole="button" accessibilityLabel="Edit profile">
          <View style={styles.avatarRing}><Avatar name={profile?.display_name ?? '?'} uri={profile?.avatar_url} size={92} /></View>
          <View style={styles.pencil}><Pencil size={15} color={colors.onPrimary} strokeWidth={2.2} /></View>
        </Pressable>
        <T variant="title" style={[styles.center, { marginTop: 12 }]}>{profile?.display_name}</T>
        <T style={[styles.center, styles.handle]}>@{profile?.username}</T>
        {profile?.bio ? <T variant="body" style={[styles.center, styles.bio]}>{profile.bio}</T> : null}
      </View>
      <View style={styles.counts}>
        {([['visits', 'Visited'], ['wishlist', 'Wishlist'], ['connections', 'Connections']] as const).map(([k, l]) => (
          <Pressable key={l} style={{ flex: 1 }} pressScale={0.97} accessibilityRole="button" accessibilityLabel={`${counts.data?.[k] ?? 0} ${l}`}
            onPress={() => k === 'connections' ? router.push('/connections') : setTab(k === 'visits' ? 'visited' : 'wishlist')}>
            <Panel style={styles.count}>
              <T variant="title" style={styles.center}>{counts.data ? String(counts.data[k]) : '–'}</T>
              <T variant="label" style={[styles.center, styles.countLabel]}>{l}</T>
            </Panel>
          </Pressable>
        ))}
      </View>
      <View style={styles.tabs}><Segmented options={TABS} value={tab} onChange={setTab} /></View>
      {tab === 'saved' ? (
        <View>
          <View style={styles.lockNote}><Lock size={15} color={colors.inkSoft} strokeWidth={2} /><T style={styles.lockText}>Only you can see this tab.</T></View>
          <View style={styles.chips}>
            <Chip label="All" selected={savedFilter === null} onPress={() => setSavedFilter(null)} />
            <Chip label="From friends" icon={UserRound} selected={savedFilter === 'friend'} onPress={() => setSavedFilter('friend')} />
            <Chip label="Internet" icon={Globe} selected={savedFilter === 'internet'} onPress={() => setSavedFilter('internet')} />
          </View>
        </View>
      ) : (
        <Panel style={styles.tools}>
          <ListRow leading={<Thumb><MapIcon size={22} color={colors.primary} strokeWidth={2} /></Thumb>} title="Open map" subtitle={tab === 'visited' ? 'Places you went' : 'Places you want to try'} chevron onPress={mapSoon} />
          {tab === 'wishlist' && lists.data && audience.data ? (
            <ListRow leading={<Thumb><Eye size={22} color={colors.primary} strokeWidth={2} /></Thumb>} title="Who can see this"
              subtitle={audienceSummary(audience.data, lists.data)} chevron onPress={() => audienceRef.current?.present()} />
          ) : null}
        </Panel>
      )}
    </View>
  );

  const empty = () => {
    if (!active) return null;
    if (active.isLoading) return <View style={{ padding: 32 }}><ActivityIndicator color={colors.primary} /></View>;
    if (active.error) return <T variant="body" style={styles.msg}>Couldn't load this. Pull down to try again.</T>;
    if (tab === 'saved') {
      return (
        <View style={styles.emptyBox}>
          <T variant="body" style={styles.center}>{savedFilter === 'internet' ? 'No internet finds yet.' : 'Nothing saved yet. Copy a friend\'s message, or tap + → A friend told me.'}</T>
          <Button label={savedFilter === 'internet' ? 'Save something you found online' : 'Save what a friend told you'} variant="tonal"
            onPress={() => router.push({ pathname: '/saved/new', params: { source: savedFilter === 'internet' ? 'internet' : 'friend' } })} />
        </View>
      );
    }
    return tab === 'visited' ? (
      <View style={styles.emptyBox}>
        <T variant="body" style={styles.center}>You haven't logged a visit yet.</T>
        <Button label="Log a place you've been" onPress={() => router.push({ pathname: '/pick-place', params: { for: 'visit' } })} />
      </View>
    ) : (
      <T variant="body" style={styles.msg}>Tap ♡ on a place to save it for later.</T>
    );
  };

  return (
    <Screen
      rings={2}
      scroll={false}
      header={
        <TopBar
          title="Profile"
          actions={
            <>
              <IconButton icon={Users} label={incoming ? `Connections, ${incoming} new requests` : 'Connections'} badge={incoming > 0}
                onPress={() => router.push({ pathname: '/connections', params: incoming ? { tab: 'requests' } : {} })} />
              <IconButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
            </>
          }
        />
      }
    >
      <FlashList
        data={rows}
        extraData={tab}
        keyExtractor={(r) => `${r.kind}:${r.id}`}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <ListRow
              leading={item.kind === 'saved'
                ? <View style={styles.src}>{item.source === 'friend' ? <UserRound size={20} color={colors.primaryStrong} strokeWidth={2} /> : <Globe size={20} color={colors.primaryStrong} strokeWidth={2} />}</View>
                : <CategoryThumb category={item.category} />}
              title={item.placeName}
              subtitle={item.kind === 'visit' ? dotJoin(item.area, item.visitedOn ? friendlyDate(item.visitedOn) : null) : item.kind === 'saved' ? item.sub : item.area ?? ''}
              trailing={(item.kind === 'visit' || item.kind === 'saved') && item.rating ? <View style={{ alignSelf: 'center' }}><ReviewPill rating={item.rating} /></View> : null}
              onPress={() => item.kind === 'wish'
                ? router.push({ pathname: '/place/[placeId]', params: { placeId: item.id } })
                : router.push({ pathname: '/entry/[type]/[id]', params: { type: item.kind === 'visit' ? 'visit' : 'saved', id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={empty}
        ListFooterComponent={
          <>
            {visits.isFetchingNextPage || saved.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : null}
            {__DEV__ ? (
              <View style={styles.dev}>
                <Button label="Design gallery (dev only)" variant="tonal" icon={Palette} onPress={() => router.push('/dev/gallery')} />
              </View>
            ) : null}
          </>
        }
        onEndReached={() => {
          if (tab === 'visited' && visits.hasNextPage && !visits.isFetchingNextPage) visits.fetchNextPage();
          if (tab === 'saved' && saved.hasNextPage && !saved.isFetchingNextPage) saved.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { counts.refetch(); active?.refetch(); }}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
      />
      {lists.data && audience.data ? (
        <AudienceSheet ref={audienceRef} title="Who can see your wishlist?" lists={lists.data} value={audience.data} onDone={(ids) => saveAudience.mutate(ids)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  id: { alignItems: 'center', gap: 2, marginTop: 4, paddingHorizontal: space.gutter },
  avatarRing: { borderRadius: 50, padding: 4, backgroundColor: colors.surface, boxShadow: '0px 10px 24px -12px rgba(20,30,50,0.5)' },
  pencil: { position: 'absolute', right: -4, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
  handle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkMuted },
  countLabel: { marginTop: 2 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: space.gutter, paddingTop: 10, paddingBottom: 10 },
  src: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  lockNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.gutter, paddingTop: 4 },
  lockText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft },
  center: { textAlign: 'center' },
  bio: { marginTop: 6, fontSize: 14 },
  counts: { flexDirection: 'row', gap: 6, paddingHorizontal: space.gutter, marginTop: 14 },
  count: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16 },
  tabs: { paddingHorizontal: space.gutter, marginTop: 14, marginBottom: 12 },
  tools: { marginHorizontal: space.gutter, marginBottom: 8, paddingVertical: 4 },
  rowWrap: { marginHorizontal: space.gutter, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' },
  msg: { textAlign: 'center', padding: 28, paddingHorizontal: space.gutter },
  emptyBox: { padding: 28, gap: 14 },
  dev: { paddingHorizontal: space.gutter, marginTop: 24 },
});
