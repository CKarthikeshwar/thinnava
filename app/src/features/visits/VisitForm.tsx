import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Calendar, ChevronRight, UsersRound } from 'lucide-react-native';
import { Button, ChipInput, Pressable, RatingPicker, T, TextField, TopBar, showSnack, type Rating } from '@/components';
import { getPlace } from '@/features/places/api';
import { CategoryThumb } from '@/features/places/components';
import { friendlyError } from '@/lib/errors';
import { friendlyDate, todayIST } from '@/lib/dates';
import { colors, fonts, radii, space, strokes } from '@/theme';
import { ENTRY_KEYS, myCompanionNames, myLists, saveVisit, type EntryDetail } from './api';
import { myConnections } from '@/features/people/api';
import { AudienceSheet, audienceSummary } from './AudienceSheet';
import { CompanionSheet, type Companions } from './CompanionSheet';
import { DateSheet } from './DateSheet';
import { askPushInContext } from '@/features/notifications/push';

type Props = { placeId: string; existing?: EntryDetail; date?: string; acceptTagId?: string };

/**
 * D2 Add / edit visit (spec §6.2, §14): date (today), rating (required), loved / didn't like, price,
 * went with (private names in M4), notes, who can see this (All connections by default).
 */
export function VisitForm({ placeId, existing, date: initialDate, acceptTagId }: Props) {
  const qc = useQueryClient();
  const place = useQuery({ queryKey: ['place', placeId], queryFn: () => getPlace(placeId) });
  const lists = useQuery({ queryKey: ['myLists'], queryFn: myLists });
  const names = useQuery({ queryKey: ['companionNames'], queryFn: myCompanionNames });

  const id = useMemo(() => existing?.id ?? randomUUID(), [existing?.id]);
  const [date, setDate] = useState(existing?.visited_on ?? initialDate ?? todayIST());
  const [rating, setRating] = useState<Rating | null>(existing?.rating ?? null);
  const [loved, setLoved] = useState<string[]>(existing?.loved ?? []);
  const [disliked, setDisliked] = useState<string[]>(existing?.disliked ?? []);
  const [price, setPrice] = useState(existing?.price_per_person ? String(existing.price_per_person) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [audience, setAudience] = useState<string[]>(existing?.audience_ids ?? []);
  const [companions, setCompanions] = useState<Companions>({
    ids: existing?.companion_ids ?? [], newNames: [],
    tags: (existing?.tags ?? []).filter((t) => t.direction === 'tagged').map((t) => t.user_id),
  });
  const conns = useQuery({ queryKey: ['connections'], queryFn: myConnections });
  const [busy, setBusy] = useState(false);

  const dateSheet = useRef<BottomSheetModal>(null);
  const audienceSheet = useRef<BottomSheetModal>(null);
  const companionSheet = useRef<BottomSheetModal>(null);

  const allLists = lists.data ?? [];
  const effectiveAudience = audience.length ? audience : allLists.filter((l) => l.kind === 'all').map((l) => l.id);
  const priceNum = price ? Number(price) : null;
  const priceOk = priceNum === null || (Number.isInteger(priceNum) && priceNum >= 1 && priceNum <= 50000);
  const companionNames = [
    ...(names.data ?? []).filter((n) => companions.ids.includes(n.id)).map((n) => n.name),
    ...companions.newNames,
    ...(conns.data ?? []).filter((c) => companions.tags.includes(c.id)).map((c) => c.display_name.split(' ')[0]),
  ];
  const onlyMe = allLists.find((l) => l.kind === 'only_me' && effectiveAudience.includes(l.id));

  const save = async () => {
    if (!rating || !priceOk) return;
    setBusy(true);
    try {
      const r = await saveVisit({
        id, place_id: placeId, visited_on: date, rating, loved, disliked, price_per_person: priceNum,
        notes: notes.trim() || null, audience: effectiveAudience, companion_name_ids: companions.ids, new_companion_names: companions.newNames,
        tag_user_ids: companions.tags, ...(acceptTagId ? { accept_tag_id: acceptTagId } : {}),
      });
      await Promise.all(ENTRY_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
      showSnack({ text: acceptTagId ? 'Saved · tag accepted' : r.removed_from_wishlist ? 'Saved · moved from your wishlist' : existing ? 'Saved' : 'Visit saved' });
      router.back();
      if (companions.tags.length) askPushInContext();
    } catch (e) {
      showSnack({ text: friendlyError(e, "Couldn't save. Try again.") });
      setBusy(false);
    }
  };

  const p = place.data;
  const audienceText = allLists.length ? audienceSummary(effectiveAudience, allLists) : 'All connections';
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar close compact title={existing ? 'Edit visit' : 'Add visit'} onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.placeBar}>
            <CategoryThumb category={p?.category ?? null} size={40} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" numberOfLines={1}>{p?.name ?? ' '}</T>
              <T variant="meta" style={styles.sub} numberOfLines={1}>{p?.area ?? ''}</T>
            </View>
            <Pressable onPress={() => dateSheet.current?.present()} style={styles.dateChip} accessibilityRole="button" accessibilityLabel={`Date: ${friendlyDate(date)}. Change`}>
              <Calendar size={16} color={colors.inkSoft} strokeWidth={2} />
              <T style={styles.dateText}>{friendlyDate(date)}</T>
            </Pressable>
          </View>

          <View style={styles.field}>
            <T variant="fieldLabel">How was it?</T>
            <RatingPicker value={rating} onChange={setRating} />
          </View>
          <ChipInput label="Loved" value={loved} onChange={setLoved} />
          <ChipInput label="Didn't like" optional value={disliked} onChange={setDisliked} />
          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <TextField label="Price / person" prefix="₹" keyboardType="number-pad" value={price}
                onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, '').slice(0, 5))}
                status={!priceOk ? { kind: 'error', text: '₹1 to ₹50,000' } : null} placeholder="450" />
            </View>
            <View style={[styles.field, { flex: 1.25 }]}>
              <T variant="fieldLabel">Went with</T>
              <Pressable onPress={() => companionSheet.current?.present()} pressScale={0.99} style={styles.inp} accessibilityRole="button"
                accessibilityLabel={`Went with: ${companionNames.length ? companionNames.join(', ') : 'nobody'}. Change`}>
                {companionNames.length ? (
                  <View style={styles.stack}>
                    {companionNames.slice(0, 2).map((n, i) => (
                      <View key={n + i} style={[styles.mini, i > 0 && { marginLeft: -6 }]}>
                        <T style={styles.miniText}>{n.charAt(0).toUpperCase()}</T>
                      </View>
                    ))}
                  </View>
                ) : (
                  <UsersRound size={18} color={colors.inkMuted} strokeWidth={2} />
                )}
                <T style={[styles.inpText, !companionNames.length && { color: colors.inkMuted }]} numberOfLines={1}>
                  {companionNames.length ? companionNames.join(', ') : 'Add'}
                </T>
              </Pressable>
            </View>
          </View>
          <TextField label="Notes" optional value={notes} onChangeText={(t) => setNotes(t.slice(0, 500))} multiline placeholder="Anything to remember?" />
          <Pressable onPress={() => audienceSheet.current?.present()} pressScale={0.99} style={styles.aud} accessibilityRole="button"
            accessibilityLabel={`Shared with ${audienceText}. Change`}>
            <UsersRound size={20} color={colors.primaryStrong} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <T style={styles.audLabel}>Shared with</T>
              <T style={styles.audValue} numberOfLines={1}>{audienceText}</T>
            </View>
            <ChevronRight size={20} color={colors.primaryStrong} strokeWidth={2} />
          </Pressable>
          {onlyMe ? <T variant="meta" style={{ marginTop: -6 }}>Only you will see this visit.</T> : null}
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button label={busy ? 'Saving…' : 'Save visit'} disabled={!rating || !priceOk || busy} onPress={save}
            accessibilityHint={!rating ? 'Choose how it was first' : undefined} />
        </SafeAreaView>
      </KeyboardAvoidingView>

      <DateSheet ref={dateSheet} value={date} onPick={setDate} />
      <AudienceSheet ref={audienceSheet} lists={allLists} value={effectiveAudience} onDone={setAudience} />
      <CompanionSheet ref={companionSheet} names={names.data ?? []} connections={conns.data ?? []} value={companions} onDone={setCompanions} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: space.gutter, paddingTop: 2, paddingBottom: 24, gap: 14 },
  placeBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.surface, boxShadow: strokes.field },
  sub: { fontSize: 13, marginTop: 1 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1px ${colors.hairline}` },
  dateText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkSoft },
  field: { gap: 6 },
  two: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  inp: { height: 54, borderRadius: radii.field, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, boxShadow: strokes.field },
  inpText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  stack: { flexDirection: 'row' },
  mini: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 0px 0px 2px ${colors.surface}` },
  miniText: { fontFamily: fonts.bodyHeavy, fontSize: 11, color: colors.primaryStrong },
  aud: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceTint, borderRadius: radii.field, paddingVertical: 12, paddingHorizontal: 14 },
  audLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  audValue: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  footer: { paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hairline },
});
