import { useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ban, Bell, BellRing, Check, Heart, ListChecks, Map as MapIcon, MoreVertical, UserMinus, UserPlus } from 'lucide-react-native';
import {
  Avatar, Button, CatPeek, Chip, Dialog, IconButton, ListRow, Panel, ReviewPill, Segmented, Sheet, SheetOption, T, Thumb, TopBar, showSnack,
} from '@/components';
import { CategoryThumb } from '@/features/places/components';
import { AddToListsSheet } from '@/features/people/AddToListsSheet';
import {
  blockUser, profilePage, removeConnection, respondRequest, setActivityNotifications, userVisits, userWishlist, type ProfilePage,
} from '@/features/people/api';
import { first, useRefreshPeople, useRelationAction } from '@/features/people/components';
import { setWishlist } from '@/features/visits/api';
import { friendlyDate } from '@/lib/dates';
import { friendlyError } from '@/lib/errors';
import { dotJoin } from '@/lib/format';
import { colors, fonts, radii, shadows, space } from '@/theme';

/** E1 connection's profile / E2 not connected (spec §14 E). Only what the visibility rule allows ever arrives (§5.2). */
export default function PersonScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const page = useQuery({ queryKey: ['profilePage', userId], queryFn: () => profilePage(userId) });
  const menu = useRef<BottomSheetModal>(null);
  const lists = useRef<BottomSheetModal>(null);
  const [confirm, setConfirm] = useState<'block' | 'remove' | null>(null);
  const refresh = useRefreshPeople();

  if (!page.data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar compact onBack={() => router.back()} />
        <View style={styles.center}>{page.isLoading ? <ActivityIndicator color={colors.primary} /> : <T variant="body">This profile isn't available.</T>}</View>
      </SafeAreaView>
    );
  }
  const p = page.data;
  const name = first(p);
  const connected = p.relation === 'connected';

  const act = async (fn: () => Promise<unknown>, done: string, back?: boolean) => {
    try { await fn(); await refresh(); showSnack({ text: done }); if (back) router.back(); }
    catch (e) { showSnack({ text: friendlyError(e) }); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar onBack={() => router.back()} actions={
        <>
          {connected ? (
            <IconButton icon={p.notify ? BellRing : Bell} active={p.notify} label={p.notify ? `Stop notifications about ${name}'s visits` : `Notify me about ${name}'s visits`}
              onPress={() => act(() => setActivityNotifications(p.id, !p.notify), p.notify ? `You won't be notified about ${name}'s visits` : `You'll hear when ${name} logs a visit`)} />
          ) : null}
          <IconButton icon={MoreVertical} label="More options" ghost onPress={() => menu.current?.present()} />
        </>
      } />
      {connected ? <Connected p={p} onLists={() => lists.current?.present()} /> : <NotConnected p={p} />}

      <Sheet ref={menu}>
        {connected ? <SheetOption icon={ListChecks} label="Add to lists" onPress={() => { menu.current?.dismiss(); lists.current?.present(); }} /> : null}
        {connected ? <SheetOption icon={UserMinus} label="Remove connection" onPress={() => { menu.current?.dismiss(); setConfirm('remove'); }} /> : null}
        <SheetOption icon={Ban} label={`Block ${name}`} onPress={() => { menu.current?.dismiss(); setConfirm('block'); }} />
      </Sheet>
      <AddToListsSheet ref={lists} person={p} current={(p.my_lists ?? []).map((l) => l.id)}
        onDone={(saved) => { if (saved) { refresh(); showSnack({ text: 'Lists updated' }); } }} />
      <Dialog visible={confirm === 'block'} icon={Ban} iconDanger destructive confirmLabel="Block" title={`Block ${name}?`}
        body={`${name} won't be able to find you, send you requests or tag you. If you're connected, you'll be disconnected. They won't be told.`}
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); act(() => blockUser(p.id), `${name} is blocked`, true); }} />
      <Dialog visible={confirm === 'remove'} icon={UserMinus} destructive confirmLabel="Remove" title={`Remove ${name}?`}
        body={`You'll stop seeing each other's visits and wishlist. Nothing is deleted, and ${name} isn't told.`}
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); act(() => removeConnection(p.id), `You and ${name} are no longer connected`); }} />
    </SafeAreaView>
  );
}

/** E2: name, photo, @username and one action (Request to connect · Requested · Accept + Decline). */
function NotConnected({ p }: { p: ProfilePage }) {
  const { run, busy } = useRelationAction();
  const refresh = useRefreshPeople();
  const name = first(p);
  return (
    <ScrollView contentContainerStyle={styles.e2}>
      <Avatar name={p.display_name} uri={p.avatar_url} size={96} />
      <T variant="title" style={[styles.centerText, { marginTop: 12 }]}>{p.display_name}</T>
      <T style={styles.handle}>@{p.username}</T>
      <View style={{ marginTop: 36, alignSelf: 'stretch' }}>
        <CatPeek width={130} />
        <Panel style={styles.e2Panel}>
          <T variant="title" style={[styles.centerText, { fontSize: 18 }]}>Connect to see where {name} eats</T>
          <T variant="body" style={[styles.centerText, { fontSize: 14, marginTop: 6, marginBottom: 16 }]}>Once you both say yes, you'll see each other's visits and wishlist.</T>
          {p.relation === 'blocked_by_me' ? (
            <T variant="body" style={styles.centerText}>You blocked {name}. Unblock from Settings → Blocked people.</T>
          ) : p.relation === 'incoming' ? (
            <View style={{ gap: 10 }}>
              <T variant="meta" style={styles.centerText}>{name} wants to connect</T>
              <Button label={busy ? '…' : 'Accept'} icon={Check} onPress={() => run(p, 'incoming')} />
              <Button label="Decline" variant="outline" onPress={async () => {
                try { await respondRequest(p.id, false); await refresh(); showSnack({ text: 'Request declined' }); } catch (e) { showSnack({ text: friendlyError(e) }); }
              }} />
            </View>
          ) : p.relation === 'requested' ? (
            <Button label={busy ? '…' : 'Requested'} variant="outline" icon={Check} onPress={() => run(p, 'requested')} accessibilityHint="Tap to cancel the request" />
          ) : (
            <Button label={busy ? '…' : 'Request to connect'} icon={UserPlus} onPress={() => run(p, 'none')} />
          )}
        </Panel>
      </View>
    </ScrollView>
  );
}

/** E1: photo, name, bio; Connected + list chips; "24 visited"; Visited · Wishlist tabs with "Open map". */
function Connected({ p, onLists }: { p: ProfilePage; onLists: () => void }) {
  const [tab, setTab] = useState<'visited' | 'wishlist'>('visited');
  const refresh = useRefreshPeople();
  const visits = useInfiniteQuery({
    queryKey: ['userVisits', p.id],
    queryFn: ({ pageParam }) => userVisits(p.id, pageParam),
    initialPageParam: undefined as { created_at: string; id: string } | undefined,
    getNextPageParam: (last) => (last.length < 20 ? undefined : { created_at: last[last.length - 1].created_at, id: last[last.length - 1].id }),
  });
  const wish = useQuery({ queryKey: ['userWishlist', p.id], queryFn: () => userWishlist(p.id), enabled: tab === 'wishlist' });
  const name = first(p);
  const listName = p.my_lists?.length ? p.my_lists.map((l) => l.name).join(', ') : 'Add to lists';
  const rows = visits.data?.pages.flat() ?? [];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => refresh()} colors={[colors.primary]} />}
      onScroll={(e) => {
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        if (tab === 'visited' && layoutMeasurement.height + contentOffset.y > contentSize.height - 300 && visits.hasNextPage && !visits.isFetchingNextPage) visits.fetchNextPage();
      }} scrollEventThrottle={200}>
      <View style={styles.idRow}>
        <Avatar name={p.display_name} uri={p.avatar_url} size={72} />
        <View style={{ flex: 1 }}>
          <T variant="title">{p.display_name}</T>
          <T style={styles.handle}>@{p.username}</T>
          {p.bio ? <T variant="body" style={{ fontSize: 13.5, marginTop: 2 }}>{p.bio}</T> : null}
        </View>
      </View>
      <View style={styles.chips}>
        <Chip label="Connected" icon={Check} style={styles.chip} />
        <View style={{ flexShrink: 1 }}><Chip label={listName} icon={ListChecks} style={styles.chip} onPress={onLists} /></View>
        <T style={styles.count} numberOfLines={1}>{p.visits ?? 0} visited</T>
      </View>
      <View style={{ paddingHorizontal: space.gutter, marginTop: 14 }}>
        <Segmented options={[{ key: 'visited', label: 'Visited' }, { key: 'wishlist', label: 'Wishlist' }]} value={tab} onChange={setTab} />
      </View>
      <Panel style={styles.tools}>
        <ListRow leading={<Thumb><MapIcon size={22} color={colors.primary} strokeWidth={2} /></Thumb>} title="Open map"
          subtitle={tab === 'visited' ? `Places ${name} went` : `Places ${name} wants to try`} chevron onPress={() => router.navigate({ pathname: '/(tabs)/map', params: { person: p.id, name, layers: tab } })} />
      </Panel>
      {tab === 'visited' ? (
        visits.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 24 }} /> : rows.length ? (
          <Panel style={styles.listPanel}>
            {rows.map((v, i) => (
              <View key={v.id} style={i > 0 && styles.divider}>
                <ListRow leading={<CategoryThumb category={v.place_category} />} title={v.place_name}
                  subtitle={dotJoin(v.place_area, friendlyDate(v.visited_on))}
                  trailing={<View style={{ alignSelf: 'center' }}><ReviewPill rating={v.rating} /></View>}
                  onPress={() => router.push({ pathname: '/entry/[type]/[id]', params: { type: 'visit', id: v.id } })} />
              </View>
            ))}
          </Panel>
        ) : <T variant="body" style={styles.msg}>{name} hasn't shared any visits with you yet.</T>
      ) : !p.wishlist_visible ? (
        <T variant="body" style={styles.msg}>{name} doesn't share their wishlist with you.</T>
      ) : wish.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 24 }} /> : wish.data?.length ? (
        <Panel style={styles.listPanel}>
          {wish.data.map((w, i) => (
            <View key={w.place_id} style={i > 0 && styles.divider}>
              <ListRow leading={<CategoryThumb category={w.category} />} title={w.name} subtitle={w.area ?? ''}
                trailing={w.i_went && !w.on_mine ? undefined : <IconButton icon={Heart} ghost={!w.on_mine} active={w.on_mine} label={w.on_mine ? 'On your wishlist' : 'Add to my wishlist'}
                  onPress={async () => {
                    if (w.on_mine) return showSnack({ text: 'Already on your wishlist' });
                    try { await setWishlist(w.place_id, true, w.name); await refresh(); showSnack({ text: 'Added to your wishlist' }); } catch (e) { showSnack({ text: friendlyError(e) }); }
                  }} />}
                onPress={() => router.push({ pathname: '/place/[placeId]', params: { placeId: w.place_id } })} />
            </View>
          ))}
        </Panel>
      ) : <T variant="body" style={styles.msg}>{name}'s wishlist is empty.</T>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  handle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkMuted },
  e2: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 22, paddingBottom: 32 },
  e2Panel: { padding: 20, paddingTop: 26, borderRadius: radii.panel, boxShadow: shadows.card },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space.gutter },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.gutter, paddingTop: 14 },
  chip: { height: 38 },
  count: { marginLeft: 'auto', flexShrink: 0, paddingLeft: 4, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkMuted },
  tools: { marginHorizontal: space.gutter, marginTop: 12, paddingVertical: 4 },
  listPanel: { marginHorizontal: 14, marginTop: 12, paddingVertical: 4, boxShadow: shadows.card },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  msg: { textAlign: 'center', padding: 28 },
});
