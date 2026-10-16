import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Search as SearchIcon, History, Store, UsersRound } from 'lucide-react-native';
import { AvatarStack, Chip, ListRow, ListSurface, Screen, SectionLabel, Segmented, T, Thumb } from '@/components';
import { autocomplete, CATEGORY_LABEL, knownPlacesByName, recentPlaces, searchPlaces, type Category, type Place } from '@/features/places/api';
import { CategoryThumb, PlaceRow, PracticeNote, SearchField } from '@/features/places/components';
import { getNear } from '@/lib/location';
import { PRICE_BUCKETS, searchPeople, whoWent, type PriceKey, type WhoWent } from '@/features/people/api';
import { PersonRow, RelationButton, useRelationAction } from '@/features/people/components';
import { colors, fonts, space } from '@/theme';

/**
 * B4 Search (spec §14). Places: while typing, places already in Thinnava then Google name suggestions;
 * on search (keyboard), Google keyword search so food words work ("biryani"). We never search our own dish text.
 * People: username prefix search (≥ 2 chars, debounced) with one status button per person.
 */
export default function Search() {
  const params = useLocalSearchParams<{ seg?: string }>();
  const [seg, setSeg] = useState<'places' | 'people'>(params.seg === 'people' ? 'people' : 'places');
  useEffect(() => { if (params.seg === 'people') setSeg('people'); }, [params.seg]);
  const [q, setQ] = useState('');
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [knownOnly, setKnownOnly] = useState(false);
  const [price, setPrice] = useState<PriceKey | null>(null);
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const session = useMemo(() => randomUUID(), []);
  const recent = useMemo(recentPlaces, [seg]);

  useEffect(() => { getNear({ ask: false }).then(setNear); }, []);
  useEffect(() => {
    const t = setTimeout(() => setTyped(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const known = useQuery({ queryKey: ['knownPlaces', typed], queryFn: () => knownPlacesByName(typed), enabled: typed.length >= 2 && !submitted });
  const suggestions = useQuery({ queryKey: ['autocomplete', typed], queryFn: () => autocomplete(typed, session, near), enabled: typed.length >= 2 && !submitted });
  const people = useQuery({ queryKey: ['people', typed], queryFn: () => searchPeople(typed), enabled: seg === 'people' && typed.length >= 2 });
  const relation = useRelationAction();
  const results = useQuery({ queryKey: ['search', submitted, near?.lat.toFixed(2)], queryFn: () => searchPlaces(submitted, near), enabled: submitted.length >= 2 });

  const open = (placeId: string) => router.push({ pathname: '/place/[placeId]', params: { placeId } });
  const who = useQuery({
    queryKey: ['whoWent', submitted, (results.data ?? []).map((p) => p.placeId).join()],
    queryFn: () => whoWent((results.data ?? []).map((p) => p.placeId)),
    enabled: !!results.data?.length,
  });
  const whoBy = new Map<string, WhoWent>((who.data ?? []).map((w) => [w.place_id, w]));
  const bucket = PRICE_BUCKETS.find((b) => b.key === price);
  const filtered = (results.data ?? []).filter((p) => {
    if (cats.length && !(p.category && cats.includes(p.category))) return false;
    const w = whoBy.get(p.placeId);
    if (knownOnly && !w) return false;
    // Places with only Google info are hidden while a price filter is on (spec §14 B4).
    if (bucket && !(w?.prices ?? []).some((x) => x >= bucket.min && x <= bucket.max)) return false;
    return true;
  });
  const knownRows = filtered.filter((p) => whoBy.has(p.placeId));
  const otherRows = filtered.filter((p) => !whoBy.has(p.placeId));
  const resultCats = Array.from(new Set((results.data ?? []).map((p) => p.category).filter(Boolean))) as Category[];
  const practice = [...(suggestions.data ?? []), ...(results.data ?? [])].some((p) => p.placeId.startsWith('practice:'));

  return (
    <Screen rings={1} scroll={false} contentStyle={styles.content}>
      <SearchField
        value={q}
        onChangeText={(t) => { setQ(t); setSubmitted(''); setCats([]); }}
        onClear={() => { setQ(''); setSubmitted(''); setCats([]); setKnownOnly(false); setPrice(null); }}
        onSubmitEditing={() => setSubmitted(q.trim())}
        placeholder={seg === 'places' ? 'Search places or a dish' : 'Search by username'}
      />
      <View style={styles.gap} />
      <Segmented options={[{ key: 'places', label: 'Places', icon: Store }, { key: 'people', label: 'People', icon: UsersRound }]} value={seg} onChange={setSeg} />

      {seg === 'people' ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }} style={{ marginTop: 12 }}>
          <ListSurface style={styles.surface}>
            <View style={{ height: 6 }} />
            {typed.length < 2 ? <Msg text="Type at least 2 letters of a username." /> : null}
            {typed.length >= 2 && people.isLoading ? <Loading /> : null}
            {typed.length >= 2 && people.data?.length === 0 ? <Msg text={`Nobody called "${typed}" yet.`} /> : null}
            {(people.data ?? []).filter((r) => r.relation !== 'blocked_by_me').map((r) => (
              <PersonRow key={r.id} person={r} relation={r.relation}
                trailing={<RelationButton person={r} relation={r.relation} busy={relation.busy === r.id} onPress={() => relation.run(r, r.relation)} />} />
            ))}
            <T variant="body" style={styles.peopleNote}>People only see each other's food life after both say yes.</T>
          </ListSurface>
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }} style={{ marginTop: 12 }}>
          {submitted && results.data?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label="Someone I know went" selected={knownOnly} onPress={() => setKnownOnly(!knownOnly)} />
              {PRICE_BUCKETS.map((b) => (
                <Chip key={b.key} label={b.label} selected={price === b.key} onPress={() => setPrice(price === b.key ? null : b.key)} />
              ))}
              {resultCats.length > 1 ? resultCats.map((c) => (
                <Chip key={c} label={CATEGORY_LABEL[c]} selected={cats.includes(c)}
                  onPress={() => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c])} />
              )) : null}
            </ScrollView>
          ) : null}
          <ListSurface style={styles.surface}>
            {submitted ? (
              <>
                {results.isLoading ? <Loading /> : null}
                {results.error ? <Msg text={(results.error as Error).message} /> : null}
                {results.data && !filtered.length ? <Msg text={results.data.length ? 'No places match these filters.' : `Nothing found for "${submitted}".`} /> : null}
                {knownRows.length ? <SectionLabel>People you know went</SectionLabel> : null}
                {knownRows.map((p: Place) => {
                  const w = whoBy.get(p.placeId)!;
                  const label = w.count ? `${w.count} went` : 'You went';
                  return (
                    <PlaceRow key={p.placeId} place={p} chevron onPress={() => open(p.placeId)}
                      trailing={<View style={styles.went}>{w.people.length ? <AvatarStack names={w.people.map((x) => x.name)} /> : null}<T style={styles.wentText}>{w.i_went && w.count ? `You + ${w.count}` : label}</T></View>} />
                  );
                })}
                {otherRows.length && !knownOnly ? <SectionLabel>Nobody you know has been</SectionLabel> : null}
                {knownOnly ? null : otherRows.map((p: Place) => <PlaceRow key={p.placeId} place={p} chevron onPress={() => open(p.placeId)} />)}
              </>
            ) : typed.length >= 2 ? (
              <>
                {known.data?.length ? <SectionLabel>In Thinnava</SectionLabel> : null}
                {known.data?.map((p) => <PlaceRow key={'k' + p.placeId} place={p} onPress={() => open(p.placeId)} />)}
                <ListRow leading={<Thumb><SearchIcon size={20} color={colors.primaryStrong} /></Thumb>} title={`See all results for "${typed}"`} onPress={() => setSubmitted(typed)} />
                {suggestions.isLoading ? <Loading /> : null}
                {suggestions.data?.filter((s) => !known.data?.some((k) => k.placeId === s.placeId)).map((s) => (
                  <ListRow key={s.placeId} leading={<CategoryThumb category={null} />} title={s.name} subtitle={s.secondary} onPress={() => open(s.placeId)} />
                ))}
              </>
            ) : (
              <>
                {recent.length ? <SectionLabel>Recent</SectionLabel> : null}
                {recent.map((r) => <ListRow key={r.placeId} leading={<Thumb><History size={22} color={colors.primaryStrong} strokeWidth={2} /></Thumb>} title={r.name} subtitle={r.area ?? ''} onPress={() => open(r.placeId)} />)}
                {!recent.length ? <Msg text={'Search a place by name, or a dish like "biryani".'} /> : null}
              </>
            )}
          </ListSurface>
          {practice ? <PracticeNote /> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const Loading = () => <View style={{ padding: 20 }}><ActivityIndicator color={colors.primary} /></View>;
const Msg = ({ text }: { text: string }) => <T variant="body" style={{ padding: space.gutter, textAlign: 'center' }}>{text}</T>;

const styles = StyleSheet.create({
  content: { paddingTop: 14 },
  gap: { height: 14 },
  chips: { gap: 8, paddingHorizontal: space.gutter, paddingBottom: 12 },
  surface: { borderRadius: 26, marginHorizontal: 0, paddingBottom: 10, minHeight: 200 },
  note: { paddingHorizontal: space.gutter, marginTop: 22 },
  went: { alignItems: 'flex-end', gap: 3 },
  wentText: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.inkSoft },
  peopleNote: { paddingHorizontal: space.gutter, paddingVertical: 14, fontSize: 13.5 },
});
