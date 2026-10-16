import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Pencil } from 'lucide-react-native';
import { Avatar, Button, Panel, ReviewPill, T, TopBar, showSnack } from '@/components';
import { NOTIF_KEYS, respondTag, tagDetail } from '@/features/notifications/api';
import { friendlyDate } from '@/lib/dates';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, shadows, space } from '@/theme';

/**
 * E8 Tag request (spec §7, §14): "Ananya says you went to Bao Story together on Oct 9." Ananya's review, then
 * Write my review (D2 prefilled, accepts the tag) · Same as Ananya's (copies it into my own visit) · Not me, reject.
 */
export default function TagRequest() {
  const { tagId } = useLocalSearchParams<{ tagId: string }>();
  const qc = useQueryClient();
  const tag = useQuery({ queryKey: ['tag', tagId], queryFn: () => tagDetail(tagId) });
  const [busy, setBusy] = useState(false);
  const refresh = () => Promise.all(NOTIF_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));

  if (!tag.data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar close compact onBack={() => router.back()} />
        <View style={styles.center}>{tag.isLoading ? <ActivityIndicator color={colors.primary} /> : <T variant="body">This tag isn't there any more.</T>}</View>
      </SafeAreaView>
    );
  }
  const t = tag.data;
  const first = t.tagger_name.split(' ')[0];
  const act = async (action: 'same' | 'reject') => {
    setBusy(true);
    try {
      const visitId = await respondTag(t.id, action);
      await refresh();
      if (action === 'reject') { showSnack({ text: 'Tag removed' }); router.back(); }
      else { showSnack({ text: `Saved as your visit · with ${first}` }); router.replace({ pathname: '/entry/[type]/[id]', params: { type: 'visit', id: visitId! } }); }
    } catch (e) { showSnack({ text: friendlyError(e) }); setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar close compact title="You were tagged" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <T variant="body" style={styles.lead}>
          <T variant="body" style={styles.b}>{first}</T> says you went to <T variant="body" style={styles.b}>{t.place_name}</T> together on {friendlyDate(t.visited_on)}.
        </T>
        <Panel style={styles.panel}>
          <View style={styles.head}>
            <Avatar name={t.tagger_name} uri={t.tagger_avatar} />
            <View style={{ flex: 1 }}>
              <T style={styles.whose}>{first}'s review</T>
              <T variant="meta">Shared with you</T>
            </View>
            <ReviewPill rating={t.rating} />
          </View>
          <View style={styles.facts}>
            {([
              ['Loved', t.loved.join(', ')],
              ["Didn't like", t.disliked.join(', ')],
              ['Price', t.price_per_person ? `₹${t.price_per_person} / person` : ''],
            ] as const).filter(([, v]) => v).map(([k, v]) => (
              <View key={k} style={styles.fact}><T style={styles.dt}>{k}</T><T style={styles.dd}>{v}</T></View>
            ))}
          </View>
        </Panel>
        {t.status === 'pending'
          ? <T variant="meta" style={styles.note}>To accept, add your own review. It'll be yours, shared with your own lists.</T>
          : <T variant="meta" style={styles.note}>You've accepted this tag.</T>}
      </ScrollView>
      {t.status === 'pending' ? (
        <View style={styles.actions}>
          <Button label="Write my review" icon={Pencil} disabled={busy}
            onPress={() => router.replace({ pathname: '/visit/new', params: { placeId: t.place_id, date: t.visited_on, acceptTagId: t.id } })} />
          <Button label={`Same as ${first}'s`} icon={Copy} variant="tonal" disabled={busy} onPress={() => act('same')} />
          <Button label="Not me, reject" variant="dangerText" disabled={busy} onPress={() => act('reject')} />
        </View>
      ) : t.tagged_visit_id ? (
        <View style={styles.actions}>
          <Button label="Open my visit" onPress={() => router.replace({ pathname: '/entry/[type]/[id]', params: { type: 'visit', id: t.tagged_visit_id! } })} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lead: { marginHorizontal: space.gutter, marginBottom: 12, fontSize: 15 },
  b: { fontFamily: fonts.bodyHeavy, color: colors.ink },
  panel: { marginHorizontal: 14, padding: 16, boxShadow: shadows.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whose: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  facts: { marginTop: 12, gap: 9 },
  fact: { flexDirection: 'row', gap: 10 },
  dt: { width: 96, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 20, color: colors.inkMuted },
  dd: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, lineHeight: 20, color: colors.ink },
  note: { marginHorizontal: space.gutter, marginTop: 14, fontSize: 13 },
  actions: { gap: 10, paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 12 },
});
