import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, ListSurface, Pressable, Screen, T, TopBar, showSnack } from '@/components';
import { markNotificationsRead, NOTIF_KEYS, notificationsPage, type Notif } from '@/features/notifications/api';
import { respondRequest } from '@/features/people/api';
import { openPerson, useRefreshPeople } from '@/features/people/components';
import { timeAgo, todayIST } from '@/lib/dates';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, space } from '@/theme';

/** F1 Notifications (spec §12, §14): Today / Earlier, inline actions; opening the screen marks everything read. */
export default function Notifications() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsPage() });
  const refreshPeople = useRefreshPeople();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ['unread'] })).catch(() => {});
  }, []);

  const refreshAll = () => Promise.all([...NOTIF_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })), refreshPeople()]);
  const answer = async (n: Notif, accept: boolean) => {
    if (!n.actor_id) return;
    setBusy(n.id);
    try {
      await respondRequest(n.actor_id, accept);
      await refreshAll();
      if (!accept) showSnack({ text: 'Request declined' });
    } catch (e) { showSnack({ text: friendlyError(e) }); }
    setBusy(null);
  };

  const today = todayIST();
  const rows = list.data ?? [];
  const isToday = (n: Notif) => new Date(new Date(n.created_at).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10) === today;
  const groups: [string, Notif[]][] = [['Today', rows.filter(isToday)], ['Earlier', rows.filter((n) => !isToday(n))]];

  return (
    <Screen header={<TopBar title="Notifications" onBack={() => router.back()} />} scroll={false}>
      <ListSurface style={{ flex: 1, paddingTop: 4 }}>
        <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={() => list.refetch()} colors={[colors.primary]} />} contentContainerStyle={{ paddingBottom: 32 }}>
          {list.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 24 }} /> : null}
          {list.data && !rows.length ? (
            <T variant="body" style={styles.empty}>Nothing yet. Requests, tags, and visits from people whose 🔔 you turned on show up here.</T>
          ) : null}
          {groups.map(([label, items]) => items.length ? (
            <View key={label}>
              <T style={styles.sec}>{label}</T>
              {items.map((n) => <Row key={n.id} n={n} busy={busy === n.id} onAnswer={(a) => answer(n, a)} />)}
            </View>
          ) : null)}
        </ScrollView>
      </ListSurface>
    </Screen>
  );
}

function Row({ n, busy, onAnswer }: { n: Notif; busy: boolean; onAnswer: (accept: boolean) => void }) {
  const who = (n.actor_name ?? 'Someone').split(' ')[0];
  const B = ({ children }: { children: string }) => <T style={styles.b}>{children}</T>;
  const text = {
    connect_request: <>{<B>{who}</B>} wants to connect</>,
    connect_accepted: <>{<B>{who}</B>} accepted your request</>,
    tag_request: <>{<B>{who}</B>} tagged you at {<B>{n.place_name ?? 'a place'}</B>}</>,
    connection_visited: <>{<B>{who}</B>} visited {<B>{n.place_name ?? 'a place'}</B>}</>,
    wishlist_visited: <>{<B>{who}</B>} visited {<B>{n.place_name ?? 'a place'}</B>}, a place on your wishlist</>,
  }[n.type];
  // Tap targets (§12): request → their profile · accepted → their profile · tag → E8 · activity → C2.
  const open = () => {
    if (n.type === 'tag_request' && n.tag_id) return router.push({ pathname: '/tag/[tagId]', params: { tagId: n.tag_id } });
    if ((n.type === 'connection_visited' || n.type === 'wishlist_visited') && n.visit_id) return router.push({ pathname: '/entry/[type]/[id]', params: { type: 'visit', id: n.visit_id } });
    if (n.actor_id) openPerson(n.actor_id);
  };
  const pendingRequest = n.type === 'connect_request' && n.actor_relation === 'incoming';
  const pendingTag = n.type === 'tag_request' && n.tag_status === 'pending';
  return (
    <Pressable onPress={open} pressScale={0.99} style={[styles.row, !n.read && styles.unread]} accessibilityRole="button">
      <Avatar name={n.actor_name ?? '?'} uri={n.actor_avatar} />
      <View style={{ flex: 1 }}>
        <T style={styles.text}>{text}</T>
        {pendingRequest ? (
          <View style={styles.acts}>
            <Button label={busy ? '…' : 'Accept'} small style={styles.btn} onPress={() => onAnswer(true)} />
            <Button label="Decline" variant="outline" small style={styles.btn} onPress={() => onAnswer(false)} />
          </View>
        ) : null}
        {pendingTag ? (
          <View style={styles.acts}>
            <Button label="Add your review" variant="tonal" small style={styles.btn} onPress={open} />
          </View>
        ) : null}
      </View>
      <T style={styles.time}>{timeAgo(n.created_at)}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sec: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft, paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 2 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: space.gutter, alignItems: 'flex-start' },
  unread: { backgroundColor: colors.surfaceTint },
  text: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, color: colors.inkSoft },
  b: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, lineHeight: 20, color: colors.ink },
  acts: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { height: 34, alignSelf: 'auto' },
  time: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkMuted },
  empty: { textAlign: 'center', padding: 28 },
});
