import { useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Bell, Globe, Layers, Lightbulb, MessageCircle, SlidersHorizontal, UserPlus, UserRound, UsersRound, Utensils, type LucideProps } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Button, Chip, EmptyState, EntryCard, IconButton, Screen, Sheet, SheetOption, T, TopBar, showSnack } from '@/components';
import { useAuth } from '@/features/auth/session';
import { homeFeed, PAGE, type FeedFilter, type FeedItem } from '@/features/visits/api';
import { CopiedMessageCard } from '@/features/import/CopiedBanners';
import { markClipboardHandled, readClipboard, useCopiedText } from '@/features/import/clipboard';
import { internetLabel } from '@/features/saved/labels';
import { openPerson } from '@/features/people/components';
import { unreadNotifications } from '@/features/notifications/api';
import { friendlyDate, timeAgo } from '@/lib/dates';
import { dotJoin } from '@/lib/format';
import { colors, fonts, radii, space } from '@/theme';

const FILTERS: { key: FeedFilter; label: string; hint?: string; icon: ComponentType<LucideProps> }[] = [
  { key: 'all', label: 'Everything', icon: Layers },
  { key: 'connections', label: 'Connections', hint: 'Reviews they posted', icon: UsersRound },
  { key: 'friends', label: 'From friends', hint: 'What friends told you', icon: UserRound },
  { key: 'internet', label: 'Internet', hint: 'Reels, videos, links', icon: Globe },
  { key: 'mine', label: 'Mine', hint: 'Places you went', icon: Utensils },
];

const EMPTY_TEXT: Record<FeedFilter, string> = {
  all: '',
  connections: 'No visits from your connections yet.',
  friends: 'No entries from friends yet.',
  internet: 'No internet finds yet.',
  mine: "You haven't logged a visit yet.",
};

/** B1 Home (spec §14): one card per entry, newest first, filter sheet, empty state for new users. */
export default function Home() {
  const profile = useAuth((s) => s.profile);
  const first = profile?.display_name.split(' ')[0];
  const [filter, setFilter] = useState<FeedFilter>('all');
  const sheet = useRef<BottomSheetModal>(null);
  const soon = (m: string) => () => showSnack({ text: `This arrives in ${m}.` });
  const copied = useCopiedText(true);
  const unread = useQuery({ queryKey: ['unread'], queryFn: unreadNotifications, refetchInterval: 60_000 });
  const readCopied = async () => {
    markClipboardHandled();
    copied.hide();
    const text = await readClipboard().catch(() => '');
    if (!text) return showSnack({ text: 'Nothing copied right now.' });
    router.push({ pathname: '/import', params: { text } });
  };

  const feed = useInfiniteQuery({
    queryKey: ['feed', filter],
    queryFn: ({ pageParam }) => homeFeed(filter, pageParam),
    initialPageParam: undefined as { created_at: string; id: string } | undefined,
    getNextPageParam: (last) => (last.length < PAGE ? undefined : { created_at: last[last.length - 1].created_at, id: last[last.length - 1].id }),
  });
  const items = feed.data?.pages.flat() ?? [];
  const active = FILTERS.find((f) => f.key === filter)!;
  const newUser = filter === 'all' && feed.isSuccess && items.length === 0;

  const header = (
    <TopBar
      wordmark
      actions={
        <>
          {/* B1a hides the filter while a new user's feed is empty (phase1 mockup). */}
          {newUser ? null : <IconButton icon={SlidersHorizontal} label="Filter" onPress={() => sheet.current?.present()} />}
          <IconButton icon={Bell} label={unread.data ? `Notifications, ${unread.data} new` : 'Notifications'} badge={!!unread.data} onPress={() => router.push('/notifications')} />
        </>
      }
    />
  );

  const empty = () => {
    if (feed.isLoading) return <View style={{ padding: 40 }}><ActivityIndicator color={colors.primary} /></View>;
    if (feed.error) return <T variant="body" style={styles.msg}>Couldn't load your feed. Pull down to try again.</T>;
    if (filter !== 'all') {
      const action = filter === 'friends' ? { label: 'Save what a friend told you', go: () => router.push({ pathname: '/saved/new', params: { source: 'friend' } }) }
        : filter === 'internet' ? { label: 'Save something you found online', go: () => router.push({ pathname: '/saved/new', params: { source: 'internet' } }) }
        : filter === 'mine' ? { label: "Log a place you've been", go: () => router.push({ pathname: '/pick-place', params: { for: 'visit' } }) }
        : null;
      return (
        <View style={styles.filteredEmpty}>
          <T variant="body" style={styles.msg}>{EMPTY_TEXT[filter]}</T>
          {action ? <Button label={action.label} variant="tonal" onPress={action.go} /> : null}
        </View>
      );
    }
    return (
      <View style={{ paddingTop: 12 }}>
        <EmptyState title={`Hi ${first ?? 'there'}! Your feed is empty.`} body="Start with whichever is easiest.">
          <Button label="Log a place you've been" icon={Utensils} onPress={() => router.push({ pathname: '/pick-place', params: { for: 'visit' } })} />
          <Button label="Save what a friend told you" icon={MessageCircle} variant="tonal" onPress={() => router.push({ pathname: '/saved/new', params: { source: 'friend' } })} />
          <Button label="Find people you know" icon={UserPlus} variant="outline" onPress={() => router.push({ pathname: '/(tabs)/search', params: { seg: 'people' } })} />
        </EmptyState>
        <View style={styles.tip}>
          <Lightbulb size={20} color={colors.primary} strokeWidth={2} />
          <T variant="label" style={styles.tipText}>Tip: copy a friend's WhatsApp message, then open <T variant="label" style={[styles.tipText, { fontFamily: fonts.bodyHeavy }]}>Thinnava</T></T>
        </View>
      </View>
    );
  };

  return (
    <Screen rings={0} scroll={false} header={header}>
      {filter !== 'all' ? (
        <View style={styles.chipRow}><Chip label={active.label} selected removable onPress={() => setFilter('all')} /></View>
      ) : null}
      <FlashList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <Card item={item} meName={profile?.display_name} meAvatar={profile?.avatar_url} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={empty}
        ListHeaderComponent={copied.has && filter === 'all' ? (
          <View style={{ marginBottom: 10 }}>
            <CopiedMessageCard onRead={readCopied} onDismiss={() => { markClipboardHandled(); copied.hide(); }} />
          </View>
        ) : null}
        onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : null}
        refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => feed.refetch()} colors={[colors.primary]} />}
      />
      <Sheet ref={sheet} title="Show">
        {FILTERS.map((f) => (
          <SheetOption key={f.key} icon={f.icon} label={f.label} hint={f.hint} selected={filter === f.key}
            onPress={() => { setFilter(f.key); sheet.current?.dismiss(); }} />
        ))}
      </Sheet>
    </Screen>
  );
}

/**
 * One timeline card. Visits: "You went to" / "Anu went to", "went Oct 10" only when the visit date differs from the day
 * it was logged. Friend entries: "Rahul told you about" + "went Oct 10" when known. Internet: "From a reel" etc.
 */
/** Who the card's avatar and name open: me → my Profile tab; a connection → their profile; a friend name → the account it's linked to. */
function personOf(item: FeedItem): (() => void) | undefined {
  if (item.entry_type === 'visit') return item.is_mine ? () => router.navigate('/(tabs)/profile') : item.author_id ? () => openPerson(item.author_id!) : undefined;
  if (item.entry_type === 'friend' && item.friend_user_id) return () => openPerson(item.friend_user_id!);
  return undefined;
}

function Card({ item, meName, meAvatar }: { item: FeedItem; meName?: string; meAvatar?: string | null }) {
  const loggedOn = item.created_at.slice(0, 10);
  const went = item.visited_on && (item.entry_type !== 'visit' || item.visited_on !== loggedOn) ? `went ${friendlyDate(item.visited_on).replace(/^(Today|Yesterday)$/, (w) => w.toLowerCase())}` : null;
  const meta = dotJoin(item.place_area, item.companions.length ? `with ${item.companions.join(', ')}` : null, went);
  const who = item.entry_type === 'friend' ? { name: item.friend_name ?? '', text: 'told you about' }
    : item.entry_type === 'internet' ? { name: internetLabel(item.source_url), text: '' }
    : item.is_mine ? { name: 'You', text: 'went to', avatarUri: meAvatar }
    : { name: item.author_name?.split(' ')[0] ?? '', text: 'went to', avatarUri: item.author_avatar };
  return (
    <EntryCard
      kind={item.entry_type}
      who={who}
      avatarName={item.is_mine ? meName : item.author_name ?? undefined}
      place={item.place_name}
      meta={meta}
      time={timeAgo(item.created_at)}
      loved={item.loved}
      disliked={item.disliked}
      rating={item.rating}
      pricePerPerson={item.price_per_person}
      isPrivate={item.is_private}
      onPress={() => router.push({ pathname: '/entry/[type]/[id]', params: { type: item.entry_type === 'visit' ? 'visit' : 'saved', id: item.id } })}
      onPressPerson={personOf(item)}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 24 },
  chipRow: { paddingHorizontal: space.gutter, paddingBottom: 8 },
  msg: { textAlign: 'center', padding: 32, paddingBottom: 16 },
  filteredEmpty: { paddingHorizontal: space.gutter, gap: 4 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceTint, borderRadius: radii.field + 2, paddingVertical: 12, paddingHorizontal: space.md, marginTop: 14, marginHorizontal: 14 },
  tipText: { flex: 1, fontSize: 13.5 },
});
