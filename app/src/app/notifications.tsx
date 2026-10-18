import { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListSurface, Screen, T, TopBar } from '@/components';
import { markNotificationsRead, notificationsPage, type Notif } from '@/features/notifications/api';
import { NotifRow, useAnswerRequest } from '@/features/notifications/NotifRow';
import { todayIST } from '@/lib/dates';
import { colors, fonts, space } from '@/theme';

/** F1 Notifications (spec §12, §14): Today / Earlier, inline actions; opening the screen marks everything read. */
export default function Notifications() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsPage() });
  const { busy, answer } = useAnswerRequest();

  useEffect(() => {
    markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ['unread'] })).catch(() => {});
  }, []);

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
              {items.map((n) => <NotifRow key={n.id} n={n} busy={busy === n.id} onAnswer={(a) => answer(n, a)} />)}
            </View>
          ) : null)}
        </ScrollView>
      </ListSurface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sec: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft, paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 2 },
  empty: { textAlign: 'center', padding: 28 },
});
