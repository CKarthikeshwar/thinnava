import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PAGE_MAX, useLayoutMode } from '@/lib/layout';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Eye, Lock, Map as MapIcon, Palette, Pencil, Settings, Users, Globe, UserRound } from 'lucide-react-native';
import { Avatar, Button, Chip, IconButton, ListRow, Panel, Pressable, ReviewPill, RingsGround, Screen, Segmented, T, Thumb, TopBar, showSnack, type Rating } from '@/components';
import { useAuth } from '@/features/auth/session';
import { CATEGORY_LABEL, type Category } from '@/features/places/api';
import { CategoryThumb } from '@/features/places/components';
import { mySaved, SAVED_PAGE, type SavedKind } from '@/features/saved/api';
import { myRequests } from '@/features/people/api';
import { internetLabel } from '@/features/saved/labels';
import { AudienceSheet, audienceSummary } from '@/features/visits/AudienceSheet';
import { homeFeed, myCounts, myLists, myWishlist, myWishlistAudience, PAGE, setWishlistAudience } from '@/features/visits/api';
import { friendlyDate } from '@/lib/dates';
import { dotJoin } from '@/lib/format';
import { colors, fonts, radii, shadows, space } from '@/theme';

type Tab = 'visited' | 'wishlist' | 'saved';
const TABS: { key: Tab; label: string }[] = [
  { key: 'visited', label: 'Visited' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'saved', label: 'Saved' },
];

type Row =
  | { kind: 'visit'; id: string; placeName: string; area: string | null; category: Category | null; rating: Rating | null; visitedOn: string | null; liked: string }
  | { kind: 'wish'; id: string; placeName: string; area: string | null; category: Category | null }
  | { kind: 'saved'; id: string; placeName: string; sub: string; source: SavedKind; rating: Rating | null };

/** B5 My profile (spec §14): identity, counts, then Visited · Wishlist · Saved, 20 at a time. */
export default function Profile() {
  const profile = useAuth((s) => s.profile);
  const qc = useQueryClient();
  const mode = useLayoutMode();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>('visited');
  // "See all" on the laptop Home wishlist box opens this tab (spec §18.3).
  useEffect(() => { if (params.tab === 'wishlist' || params.tab === 'saved' || params.tab === 'visited') setTab(params.tab); }, [params.tab]);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myWishlistAudience'] }); showSnack({ text: 'Updated who can see your wishlist.' }); },
    onError: () => showSnack({ text: "Couldn't change who sees your wishlist. Try again." }),
  });

  const rows: Row[] =
    tab === 'visited'
      ? (visits.data?.pages.flat() ?? []).map((v) => ({ kind: 'visit', id: v.id, placeName: v.place_name, area: v.place_area, category: v.place_category, rating: v.rating, visitedOn: v.visited_on, liked: v.loved.join(', ') }))
      : tab === 'wishlist'
        ? (wishlist.data ?? []).map((w) => ({ kind: 'wish', id: w.place_id, placeName: w.name, area: w.area, category: w.category }))
        : (saved.data?.pages.flat() ?? []).map((s) => ({
            kind: 'saved', id: s.id, placeName: s.place_name, source: s.kind, rating: s.rating,
            sub: dotJoin(s.kind === 'friend' ? s.friend_name : internetLabel(s.source_url).replace(/^From an? /, '').replace(/^\w/, (c) => c.toUpperCase()), s.place_area),
          }));
  const active = tab === 'visited' ? visits : tab === 'wishlist' ? wishlist : saved;
  // "Open map" → B2 limited to this tab's places (spec §14 B5).
  const openMap = () => router.navigate({ pathname: '/(tabs)/map', params: { layers: tab } });

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
          <ListRow leading={<Thumb><MapIcon size={22} color={colors.primary} strokeWidth={2} /></Thumb>} title="Open map" subtitle={tab === 'visited' ? 'Places you went' : 'Places you want to try'} chevron onPress={openMap} />
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

  const openRow = (item: Row) => item.kind === 'wish'
    ? router.push({ pathname: '/place/[placeId]', params: { placeId: item.id } })
    : router.push({ pathname: '/entry/[type]/[id]', params: { type: item.kind === 'visit' ? 'visit' : 'saved', id: item.id } });

  // Laptop web (spec §18.3): cover band, identity and counts on one row, underlined tabs, a 3-column grid of cards.
  if (mode === 'laptop') {
    const more = tab === 'visited' ? visits : tab === 'saved' ? saved : null;
    return (
      <Screen scroll={false}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.cover}><RingsGround variant={2} /></View>
          <View style={styles.page}>
            <View style={styles.head}>
              <Pressable onPress={() => router.push('/settings/profile')} pressScale={0.97} accessibilityRole="button" accessibilityLabel="Edit profile">
                <View style={styles.bigRing}><Avatar name={profile?.display_name ?? '?'} uri={profile?.avatar_url} size={116} /></View>
                <View style={styles.pencil}><Pencil size={15} color={colors.onPrimary} strokeWidth={2.2} /></View>
              </Pressable>
              <View style={{ flex: 1, paddingTop: 70 }}>
                <T style={styles.bigName} accessibilityRole="header">{profile?.display_name}</T>
                <T style={styles.handle}>@{profile?.username}{profile?.bio ? `  ·  ${profile.bio}` : ''}</T>
                <View style={styles.stats}>
                  {([['visits', 'visited'], ['wishlist', 'wishlist'], ['connections', 'connections']] as const).map(([k, l]) => (
                    <T key={k} style={styles.stat} onPress={() => k === 'connections' ? router.push('/connections') : setTab(k === 'visits' ? 'visited' : 'wishlist')}>
                      <T style={styles.statNum}>{counts.data ? String(counts.data[k]) : '–'}</T> {l}
                    </T>
                  ))}
                </View>
              </View>
              <Button label={incoming ? `Connections · ${incoming} new` : 'Connections'} icon={Users} variant="outline" small
                onPress={() => router.push({ pathname: '/connections', params: incoming ? { tab: 'requests' } : {} })} style={styles.headBtn} />
              <Button label="Settings" icon={Settings} variant="outline" small onPress={() => router.push('/settings')} style={styles.headBtn} />
            </View>

            <View style={styles.ptabs}>
              {TABS.map((t) => {
                const on = tab === t.key;
                const n = t.key === 'visited' ? counts.data?.visits : t.key === 'wishlist' ? counts.data?.wishlist : counts.data?.saved;
                return (
                  <Pressable key={t.key} onPress={() => setTab(t.key)} pressScale={0.98} style={styles.ptab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                    <T style={[styles.ptabText, on && { color: colors.ink }]}>{t.label}{n !== undefined ? <T style={styles.ptabCount}>  {n}</T> : null}</T>
                    {on ? <View style={styles.ptabLine} /> : null}
                  </Pressable>
                );
              })}
              <View style={{ flex: 1 }} />
              {tab === 'wishlist' && lists.data && audience.data ? (
                <Pressable onPress={() => audienceRef.current?.present()} pressScale={0.98} style={styles.ptabLink} accessibilityRole="button">
                  <Eye size={15} color={colors.primary} strokeWidth={2.2} />
                  <T style={styles.ptabLinkText}>{audienceSummary(audience.data, lists.data)}</T>
                </Pressable>
              ) : null}
              {tab !== 'saved' ? (
                <Pressable onPress={openMap} pressScale={0.98} style={styles.ptabLink} accessibilityRole="link">
                  <MapIcon size={15} color={colors.primary} strokeWidth={2.2} />
                  <T style={styles.ptabLinkText}>Open on map</T>
                </Pressable>
              ) : null}
            </View>

            {tab === 'saved' ? (
              <View style={[styles.chips, { paddingHorizontal: 0 }]}>
                <Chip label="All" selected={savedFilter === null} onPress={() => setSavedFilter(null)} />
                <Chip label="From friends" icon={UserRound} selected={savedFilter === 'friend'} onPress={() => setSavedFilter('friend')} />
                <Chip label="Internet" icon={Globe} selected={savedFilter === 'internet'} onPress={() => setSavedFilter('internet')} />
                <View style={[styles.lockNote, { paddingHorizontal: 8 }]}><Lock size={15} color={colors.inkSoft} strokeWidth={2} /><T style={styles.lockText}>Only you can see this tab.</T></View>
              </View>
            ) : <View style={{ height: 16 }} />}

            {rows.length ? (
              <View style={styles.grid}>
                {rows.map((item) => (
                  <Pressable key={`${item.kind}:${item.id}`} onPress={() => openRow(item)} pressScale={0.98} style={styles.gcard} accessibilityRole="link" accessibilityLabel={item.placeName}>
                    <T style={styles.gName} numberOfLines={1}>{item.placeName}</T>
                    <T variant="meta" numberOfLines={1}>
                      {item.kind === 'visit' ? dotJoin(item.area, item.category && CATEGORY_LABEL[item.category], item.visitedOn ? friendlyDate(item.visitedOn) : null)
                        : item.kind === 'saved' ? item.sub : dotJoin(item.area, item.category && CATEGORY_LABEL[item.category])}
                    </T>
                    {item.kind === 'visit' && item.liked ? <T variant="card" numberOfLines={1} style={{ marginTop: 8 }}>♡ {item.liked}</T> : null}
                    {(item.kind === 'visit' || item.kind === 'saved') && item.rating ? <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><ReviewPill rating={item.rating} /></View> : null}
                  </Pressable>
                ))}
              </View>
            ) : empty()}
            {more?.hasNextPage ? (
              <Button label={more.isFetchingNextPage ? 'Loading…' : 'Show more'} variant="tonal" small onPress={() => more.fetchNextPage()} style={{ alignSelf: 'center', marginTop: 18 }} />
            ) : null}
          </View>
        </ScrollView>
        {lists.data && audience.data ? (
          <AudienceSheet ref={audienceRef} title="Who can see your wishlist?" lists={lists.data} value={audience.data} onDone={(ids) => saveAudience.mutate(ids)} />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      rings={2}
      scroll={false}
      header={mode === 'phone' ? (
        // Phone browser: the web top bar is above, so just the two links (spec §18.3).
        <View style={styles.webLinks}>
          <Pressable onPress={() => router.push({ pathname: '/connections', params: incoming ? { tab: 'requests' } : {} })} pressScale={0.97} style={styles.ptabLink} accessibilityRole="link">
            <Users size={16} color={colors.primary} strokeWidth={2.2} />
            <T style={styles.ptabLinkText}>{incoming ? `Connections · ${incoming} new` : 'Connections'}</T>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} pressScale={0.97} style={styles.ptabLink} accessibilityRole="link">
            <Settings size={16} color={colors.primary} strokeWidth={2.2} />
            <T style={styles.ptabLinkText}>Settings</T>
          </Pressable>
        </View>
      ) : (
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
      )}
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
  webLinks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4 },
  // Laptop
  cover: { height: 170, backgroundColor: colors.primaryContainer, overflow: 'hidden' },
  page: { width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center', paddingHorizontal: 24 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 22, marginTop: -58 },
  bigRing: { borderRadius: 70, padding: 5, backgroundColor: colors.background },
  bigName: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  stats: { flexDirection: 'row', gap: 22, marginTop: 8 },
  stat: { fontFamily: fonts.bodySemi, fontSize: 14.5, color: colors.inkSoft },
  statNum: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  headBtn: { height: 40, marginTop: 74 },
  ptabs: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.hairline, marginTop: 22, gap: 4 },
  ptab: { paddingVertical: 12, paddingHorizontal: 14 },
  ptabText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkSoft },
  ptabCount: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.inkMuted },
  ptabLine: { position: 'absolute', left: 12, right: 12, bottom: -1, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: colors.primary },
  ptabLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  ptabLinkText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gcard: { width: 'calc(33.333% - 10px)' as unknown as number, backgroundColor: colors.surface, borderRadius: radii.card - 2, padding: 16, boxShadow: shadows.card },
  gName: { fontFamily: fonts.display, fontSize: 18.5, color: colors.ink },
  dev: { paddingHorizontal: space.gutter, marginTop: 24 },
});
