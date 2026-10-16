import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, X } from 'lucide-react-native';
import { Button, IconButton, ListSurface, Pressable, T, TopBar, showSnack } from '@/components';
import { myConnections, myRequests, respondRequest } from '@/features/people/api';
import { PersonRow, useRefreshPeople, useRelationAction } from '@/features/people/components';
import { friendlyError } from '@/lib/errors';
import { timeAgo } from '@/lib/dates';
import { colors, fonts, MAX_FONT_SCALE, radii, shadows, space } from '@/theme';

/** E3 Connections (spec §14): Connections · N (with search) and Requests · N (incoming Accept / ×, sent Cancel). */
export default function Connections() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'connections' | 'requests'>(params.tab === 'requests' ? 'requests' : 'connections');
  const [q, setQ] = useState('');
  const conns = useQuery({ queryKey: ['connections'], queryFn: myConnections });
  const reqs = useQuery({ queryKey: ['requests'], queryFn: myRequests });
  const refresh = useRefreshPeople();
  const { run, busy } = useRelationAction();

  const incoming = (reqs.data ?? []).filter((r) => r.direction === 'incoming');
  const outgoing = (reqs.data ?? []).filter((r) => r.direction === 'outgoing');
  const shown = (conns.data ?? []).filter((c) => !q.trim() || `${c.display_name} ${c.username}`.toLowerCase().includes(q.trim().toLowerCase()));
  const decline = async (id: string) => {
    try { await respondRequest(id, false); await refresh(); showSnack({ text: 'Request declined' }); } catch (e) { showSnack({ text: friendlyError(e) }); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar title="Connections" onBack={() => router.back()}
        actions={<IconButton icon={UserPlus} label="Find people" ghost onPress={() => router.push({ pathname: '/(tabs)/search', params: { seg: 'people' } })} />} />
      <View style={styles.tabs} accessibilityRole="tablist">
        {([['connections', `Connections · ${conns.data?.length ?? 0}`], ['requests', `Requests · ${incoming.length + outgoing.length}`]] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <T style={[styles.tabText, tab === k && styles.tabOn]}>{label}</T>
            {tab === k ? <View style={styles.underline} /> : null}
          </Pressable>
        ))}
      </View>
      <ListSurface style={styles.surface}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {tab === 'connections' ? (
            <>
              {(conns.data?.length ?? 0) > 6 ? (
                <View style={styles.search}>
                  <Search size={18} color={colors.inkMuted} strokeWidth={2} />
                  <TextInput value={q} onChangeText={setQ} placeholder="Search your connections" placeholderTextColor={colors.inkMuted}
                    style={styles.searchInput} maxFontSizeMultiplier={MAX_FONT_SCALE} />
                </View>
              ) : null}
              {conns.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 24 }} /> : null}
              {shown.map((c) => <PersonRow key={c.id} person={c} />)}
              {conns.data && !conns.data.length ? (
                <View style={styles.empty}>
                  <T variant="body" style={styles.center}>No connections yet. Find people you know by their username.</T>
                  <Button label="Find people" variant="tonal" onPress={() => router.push({ pathname: '/(tabs)/search', params: { seg: 'people' } })} />
                </View>
              ) : null}
            </>
          ) : (
            <>
              {reqs.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 24 }} /> : null}
              {incoming.length ? <T style={styles.sec}>Want to connect with you</T> : null}
              {incoming.map((r) => (
                <PersonRow key={'i' + r.id} person={r} trailing={
                  <View style={styles.pair}>
                    <Button label={busy === r.id ? '…' : 'Accept'} variant="tonal" small style={styles.btn} onPress={() => run(r, 'incoming')} />
                    <IconButton icon={X} ghost label={`Decline ${r.display_name}`} onPress={() => decline(r.id)} style={{ width: 40, height: 40 }} />
                  </View>
                } />
              ))}
              {outgoing.length ? <T style={styles.sec}>You asked</T> : null}
              {outgoing.map((r) => (
                <PersonRow key={'o' + r.id} person={r} sub={`@${r.username} · ${askedAgo(r.created_at)}`}
                  trailing={<Button label={busy === r.id ? '…' : 'Cancel'} variant="outline" small style={styles.btn} onPress={() => run(r, 'requested')} />} />
              ))}
              {reqs.data && !reqs.data.length ? <T variant="body" style={[styles.center, { padding: 28 }]}>No requests right now.</T> : null}
            </>
          )}
        </ScrollView>
      </ListSurface>
    </SafeAreaView>
  );
}

/** "just now" / "2 days ago" / "on Oct 9" for sent requests (E3 mockup: "2 days ago"). */
function askedAgo(ts: string) {
  const t = timeAgo(ts);
  if (t === 'now') return 'just now';
  const m = t.match(/^(\d+)([mhd])$/);
  if (!m) return `on ${t}`;
  const n = Number(m[1]); const unit = { m: 'minute', h: 'hour', d: 'day' }[m[2] as 'm' | 'h' | 'd'];
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.hairline, marginTop: 4 },
  tab: { flex: 1, alignItems: 'center', paddingTop: 14, paddingBottom: 12 },
  tabText: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.inkSoft },
  tabOn: { color: colors.primary },
  underline: { position: 'absolute', left: '24%', right: '24%', bottom: -1, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: colors.primary },
  surface: { flex: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 4 },
  sec: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft, paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 2 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: { alignSelf: 'auto', height: 36 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, marginHorizontal: space.gutter, marginTop: 10, marginBottom: 4, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.surface, boxShadow: shadows.card },
  searchInput: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink, paddingVertical: 0 },
  empty: { padding: 28, gap: 14 },
  center: { textAlign: 'center' },
});
