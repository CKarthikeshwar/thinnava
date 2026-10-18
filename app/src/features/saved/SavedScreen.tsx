import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Button, T, TopBar, showSnack } from '@/components';
import { getPlace } from '@/features/places/api';
import { useTakePicked } from '@/features/places/picked';
import { UseCopiedBanner } from '@/features/import/CopiedBanners';
import { PASTE_TEXT, readClipboard, useCopiedText } from '@/features/import/clipboard';
import { friendlyError } from '@/lib/errors';
import { colors, space } from '@/theme';
import { myFriendNames, SAVED_KEYS, saveSaved, savedDetail, type SavedKind } from './api';
import { canSave, emptyDraft, SavedFields, type SavedDraft } from './SavedFields';
import { toFeedItem, toInput } from './draft';
import { showInFeed } from '@/features/visits/api';
import { markFresh } from '@/lib/fresh';

type Props = { source?: SavedKind; placeId?: string; editId?: string };

/** D5 friend / internet entry by hand (spec §14): `/saved/new?source=friend|internet&placeId=` and `/saved/[id]/edit`. */
export function SavedScreen({ source = 'friend', placeId, editId }: Props) {
  const qc = useQueryClient();
  const names = useQuery({ queryKey: ['friendNames'], queryFn: myFriendNames });
  const existing = useQuery({ queryKey: ['entry', 'saved', editId], queryFn: () => savedDetail(editId!), enabled: !!editId });
  const startPlace = useQuery({ queryKey: ['place', placeId], queryFn: () => getPlace(placeId!), enabled: !!placeId && !editId });
  const copied = useCopiedText(false);
  const id = useMemo(() => editId ?? randomUUID(), [editId]);
  const [d, setD] = useState<SavedDraft>(emptyDraft(source));
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<SavedDraft>) => setD((cur) => ({ ...cur, ...p }));

  useEffect(() => { if (startPlace.data) patch({ place: startPlace.data }); }, [startPlace.data?.placeId]);
  useEffect(() => {
    const e = existing.data;
    if (!e) return;
    getPlace(e.place_id).then((place) => setD({
      kind: e.type, place, rating: e.rating, loved: e.loved, disliked: e.disliked,
      price: e.price_per_person ? String(e.price_per_person) : '', visitedOn: e.visited_on, link: e.source_url ?? '',
      friend: e.friend_name_id && e.friend_name ? { id: e.friend_name_id, name: e.friend_name, isNew: false } : null,
    }));
  }, [existing.data?.id]);
  useTakePicked((place) => patch({ place }));

  const useCopied = async () => {
    const text = await readClipboard().catch(() => '');
    if (!text) { copied.hide(); showSnack({ text: PASTE_TEXT.empty }); return; }
    router.replace({ pathname: '/import', params: { text, source: d.kind } });
  };

  const save = async () => {
    if (!canSave(d)) return;
    setBusy(true);
    try {
      const r = await saveSaved(toInput(id, d), d.kind === 'friend' ? `${d.friend!.name}'s tip about ${d.place!.name}` : `${d.place!.name}, found online`);
      if (!editId && !r.draft) markFresh(id);
      if (r.draft) {
        showSnack({ text: 'Saved as a draft · pick the place in Offline drafts' });
      } else if (r.queued) {
        showInFeed(toFeedItem(id, d), ['all', d.kind === 'friend' ? 'friends' : 'internet']);
        showSnack({ text: "Saved · it'll sync when you're online" });
      } else {
        await Promise.all(SAVED_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
        showSnack({ text: editId ? 'Saved' : d.kind === 'friend' ? `Saved ${d.friend!.name}'s experience` : 'Saved' });
      }
      router.back();
    } catch (e) {
      showSnack({ text: friendlyError(e, "Couldn't save. Try again.") });
      setBusy(false);
    }
  };

  const title = editId ? 'Edit entry' : d.kind === 'friend' ? 'A friend told me' : 'Found it online';
  if (editId && !existing.data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar close compact title={title} onBack={() => router.back()} />
        <View style={styles.center}>{existing.isLoading ? <ActivityIndicator color={colors.primary} /> : <T variant="body">This entry isn't available.</T>}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar close compact title={title} onBack={() => router.back()} />
      {!editId && copied.has ? <UseCopiedBanner onUse={useCopied} /> : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SavedFields value={d} onChange={patch} names={names.data ?? []}
            onChangePlace={() => router.push({ pathname: '/pick-place', params: { for: 'select' } })} />
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button label={busy ? 'Saving…' : 'Save'} disabled={!canSave(d) || busy} onPress={save}
            accessibilityHint={d.kind === 'friend' && !d.friend ? 'Add who told you first' : !d.place ? 'Pick the place first' : undefined} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: space.gutter, paddingTop: 2, paddingBottom: 24, gap: 14 },
  footer: { paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hairline },
});
