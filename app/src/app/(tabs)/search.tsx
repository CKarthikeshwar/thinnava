import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Search as SearchIcon, History, LocateFixed, Store, UsersRound } from 'lucide-react-native';
import { AvatarStack, CheckBox, Chip, ListRow, ListSurface, OfflineStrip, Pressable, Screen, SectionLabel, Segmented, T, Thumb } from '@/components';
import { autocomplete, CATEGORY_LABEL, knownPlacesByName, recentPlaces, searchPlaces, type Category, type Place } from '@/features/places/api';
import { CategoryThumb, PlaceRow, PracticeNote, SearchField } from '@/features/places/components';
import { getNear } from '@/lib/location';
import { PRICE_BUCKETS, searchPeople, whoWent, type PriceKey, type WhoWent } from '@/features/people/api';
import { PersonRow, RelationButton, useRelationAction } from '@/features/people/components';
import { PAGE_MAX, useLayoutMode } from '@/lib/layout';
import { PlaceCredit } from '@/features/places/AddPlaceSheet';
import { colors, fonts, radii, shadows, space } from '@/theme';

/**
 * B4 Search (spec §14). Places: while typing, places already in Thinnava then Google name suggestions;
 * on search (keyboard), Google keyword search so food words work ("biryani"). We never search our own dish text.
 * People: username prefix search (≥ 2 chars, debounced) with one status button per person.
 * Laptop web (spec §18.3): a large search box, a filter sidebar and the results as a table.
 */
export default function Search() {
  const params = useLocalSearchParams<{ seg?: string; focus?: string }>();
  const mode = useLayoutMode();
  const input = useRef<TextInput>(null);
  // Web: the top bar's search box and the "/" key land here with the cursor in the field.
  useEffect(() => { if (params.focus) setTimeout(() => input.current?.focus(), 50); }, [params.focus]);
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

  const field = (placeholder: string, big?: boolean) => (
    <SearchField
      ref={input}
      value={q}
      onChangeText={(t) => { setQ(t); setSubmitted(''); setCats([]); }}
      onClear={() => { setQ(''); setSubmitted(''); setCats([]); setKnownOnly(false); setPrice(null); }}
      onSubmitEditing={() => setSubmitted(q.trim())}
      placeholder={placeholder}
      style={big ? { fontSize: 18 } : undefined}
    />
  );
  const peopleList = (
    <>
      <View style={{ height: 6 }} />
      {typed.length < 2 ? <Msg text="Type at least 2 letters of a username." /> : null}
      {typed.length >= 2 && people.isLoading ? <Loading /> : null}
      {typed.length >= 2 && people.data?.length === 0 ? <Msg text={`Nobody called "${typed}" yet.`} /> : null}
      {(people.data ?? []).filter((r) => r.relation !== 'blocked_by_me').map((r) => (
        <PersonRow key={r.id} person={r} relation={r.relation}
          trailing={<RelationButton person={r} relation={r.relation} busy={relation.busy === r.id} onPress={() => relation.run(r, r.relation)} />} />
      ))}
      <T variant="body" style={styles.peopleNote}>People only see each other's food life after both say yes.</T>
    </>
  );
  const typing = (
    <>
      {known.data?.length ? <SectionLabel>In Thinnava</SectionLabel> : null}
      {known.data?.map((p) => <PlaceRow key={'k' + p.placeId} place={p} onPress={() => open(p.placeId)} />)}
      <ListRow leading={<Thumb><SearchIcon size={20} color={colors.primaryStrong} /></Thumb>} title={`See all results for "${typed}"`} onPress={() => setSubmitted(typed)} />
      {suggestions.isLoading ? <Loading /> : null}
      {suggestions.data?.filter((s) => !known.data?.some((k) => k.placeId === s.placeId)).map((s) => (
        <ListRow key={s.placeId} leading={<CategoryThumb category={s.category ?? null} />} title={s.name} subtitle={s.secondary} onPress={() => open(s.placeId)} />
      ))}
    </>
  );
  const recentList = (hint: string) => (
    <>
      {recent.length ? <SectionLabel>Recent</SectionLabel> : null}
      {recent.map((r) => <ListRow key={r.placeId} leading={<Thumb><History size={22} color={colors.primaryStrong} strokeWidth={2} /></Thumb>} title={r.name} subtitle={r.area ?? ''} onPress={() => open(r.placeId)} />)}
      {!recent.length ? <Msg text={hint} /> : null}
    </>
  );
  const status = (
    <>
      {results.isLoading ? <Loading /> : null}
      {results.error ? <Msg text={(results.error as Error).message} /> : null}
      {results.data && !filtered.length ? <Msg text={results.data.length ? 'No places match these filters.' : `Nothing found for "${submitted}".`} /> : null}
    </>
  );

  if (mode === 'laptop') {
    const toggleCat = (c: Category) => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c]);
    const askNear = () => getNear({ ask: true }).then((n) => { if (n) setNear(n); });
    const header = (
      <View style={[styles.tr, styles.th]}>
        <T style={[styles.thText, styles.cPlace]}>Place</T>
        <T style={[styles.thText, styles.cWho]}>Who went</T>
        <T style={[styles.thText, styles.cArea]}>Area</T>
        <T style={[styles.thText, styles.cPrice]}>Price / person</T>
      </View>
    );
    return (
      <Screen scroll={false}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.wide}>
          <View style={{ marginHorizontal: -space.gutter }}>{field(seg === 'places' ? 'Search places, or a food like "biryani"' : 'Search by username', true)}</View>
          <View style={styles.scopeRow}>
            <Segmented compact options={[{ key: 'places', label: 'Places' }, { key: 'people', label: 'People' }]} value={seg} onChange={setSeg} />
            <View style={{ flex: 1 }} />
            {seg === 'places' ? (
              <Pressable onPress={askNear} pressScale={0.97} style={styles.near} accessibilityRole="button"
                accessibilityLabel={near ? 'Searching near you' : 'Searching near Bengaluru. Use my location'}>
                <LocateFixed size={16} color={colors.inkSoft} strokeWidth={2} />
                <T style={styles.nearText}>{near ? 'Near you' : 'Near Bengaluru'}</T>
              </Pressable>
            ) : null}
          </View>

          {seg === 'people' ? (
            <ListSurface style={[styles.surface, styles.narrow]}>{peopleList}</ListSurface>
          ) : submitted ? (
            <View style={styles.grid}>
              <View style={styles.filters}>
                <T style={styles.fh}>WHO WENT</T>
                <Check label="Someone I know went" on={knownOnly} onPress={() => setKnownOnly(!knownOnly)} />
                {resultCats.length > 1 ? (
                  <>
                    <T style={styles.fh}>TYPE</T>
                    {resultCats.map((c) => <Check key={c} label={CATEGORY_LABEL[c]} on={cats.includes(c)} onPress={() => toggleCat(c)} />)}
                  </>
                ) : null}
                <T style={styles.fh}>PRICE PER PERSON</T>
                {PRICE_BUCKETS.map((b) => <Check key={b.key} label={b.label} on={price === b.key} onPress={() => setPrice(price === b.key ? null : b.key)} />)}
                {knownOnly || cats.length || price ? (
                  <T style={styles.clear} onPress={() => { setKnownOnly(false); setCats([]); setPrice(null); }} accessibilityRole="button">Clear filters</T>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 12 }}>
                {status}
                {knownRows.length ? (
                  <>
                    <T style={styles.groupHead}>Your people went</T>
                    <View style={styles.table}>{header}{knownRows.map((p) => <ResultRow key={p.placeId} place={p} who={whoBy.get(p.placeId)} onPress={() => open(p.placeId)} />)}</View>
                  </>
                ) : null}
                {otherRows.length ? (
                  knownOnly ? (
                    <T variant="meta">
                      {otherRows.length === 1 ? '1 more place' : `${otherRows.length} more places`} nobody you know has been to.{' '}
                      <T variant="meta" style={{ color: colors.primary }} onPress={() => setKnownOnly(false)}>Show</T>
                    </T>
                  ) : (
                    <>
                      <T style={styles.groupHead}>Nobody you know has been</T>
                      <View style={styles.table}>{knownRows.length ? null : header}{otherRows.map((p) => <ResultRow key={p.placeId} place={p} onPress={() => open(p.placeId)} />)}</View>
                    </>
                  )
                ) : null}
                {practice ? <PracticeNote /> : seg === 'places' && (typed.length >= 2 || submitted) ? <PlaceCredit /> : null}
              </View>
            </View>
          ) : (
            <ListSurface style={[styles.surface, styles.narrow]}>
              {typed.length >= 2 ? typing : recentList('Search a place by name, or a food like "biryani", then press Enter.')}
            </ListSurface>
          )}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen rings={1} scroll={false} contentStyle={styles.content} header={<OfflineStrip />}>
      {field(seg === 'places' ? 'Search places or a dish' : 'Search by username')}
      <View style={styles.gap} />
      <Segmented options={[{ key: 'places', label: 'Places', icon: Store }, { key: 'people', label: 'People', icon: UsersRound }]} value={seg} onChange={setSeg} />

      {seg === 'people' ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }} style={{ marginTop: 12 }}>
          <ListSurface style={styles.surface}>{peopleList}</ListSurface>
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
                {status}
                {knownRows.length ? <SectionLabel>People you know went</SectionLabel> : null}
                {knownRows.map((p: Place) => {
                  const w = whoBy.get(p.placeId)!;
                  return (
                    <PlaceRow key={p.placeId} place={p} chevron onPress={() => open(p.placeId)}
                      trailing={<View style={styles.went}>{w.people.length ? <AvatarStack names={w.people.map((x) => x.name)} /> : null}<T style={styles.wentText}>{wentLabel(w)}</T></View>} />
                  );
                })}
                {otherRows.length && !knownOnly ? <SectionLabel>Nobody you know has been</SectionLabel> : null}
                {knownOnly ? null : otherRows.map((p: Place) => <PlaceRow key={p.placeId} place={p} chevron onPress={() => open(p.placeId)} />)}
              </>
            ) : typed.length >= 2 ? typing : recentList('Search a place by name, or a dish like "biryani".')}
          </ListSurface>
          {practice ? <PracticeNote /> : seg === 'places' && (typed.length >= 2 || submitted) ? <PlaceCredit /> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

/** "3 went" · "You went" · "You + 2". */
const wentLabel = (w: WhoWent) => (w.i_went && w.count ? `You + ${w.count}` : w.count ? `${w.count} went` : 'You went');

/** Prices people I can see paid there: "₹350" or "₹300–450". */
function priceRange(w?: WhoWent) {
  const p = (w?.prices ?? []).filter((x) => x > 0);
  if (!p.length) return '';
  const lo = Math.min(...p);
  const hi = Math.max(...p);
  return lo === hi ? `₹${lo}` : `₹${lo}–${hi}`;
}

/** Laptop results table row: Place · Who went · Area · Price. */
function ResultRow({ place, who, onPress }: { place: Place; who?: WhoWent; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} pressScale={0.995} style={[styles.tr, styles.trLine]} accessibilityRole="link" accessibilityLabel={place.name}>
      <View style={styles.cPlace}>
        <T style={styles.pn} numberOfLines={1}>{place.name}</T>
        <T variant="meta" numberOfLines={1}>{place.category ? CATEGORY_LABEL[place.category] : 'Place'}</T>
      </View>
      <View style={[styles.cWho, styles.whoCell]}>
        {who?.people.length ? <AvatarStack names={who.people.map((x) => x.name)} /> : null}
        <T variant="meta" numberOfLines={1}>{who ? wentLabel(who) : ''}</T>
      </View>
      <T variant="card" style={styles.cArea} numberOfLines={1}>{place.area ?? ''}</T>
      <T style={[styles.cPrice, styles.price]}>{priceRange(who)}</T>
    </Pressable>
  );
}

/** Laptop filter sidebar row: a checkbox and its label. */
function Check({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} pressScale={0.99} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      <CheckBox on={on} />
      <T style={[styles.checkText, on && { color: colors.ink }]}>{label}</T>
    </Pressable>
  );
}

const Loading = () => <View style={{ padding: 20 }}><ActivityIndicator color={colors.primary} /></View>;
const Msg = ({ text }: { text: string }) => <T variant="body" style={{ padding: space.gutter, textAlign: 'center' }}>{text}</T>;

const styles = StyleSheet.create({
  content: { paddingTop: 14 },
  gap: { height: 14 },
  chips: { gap: 8, paddingHorizontal: space.gutter, paddingBottom: 12 },
  surface: { borderRadius: 26, marginHorizontal: 0, paddingBottom: 10, minHeight: 200 },
  narrow: { maxWidth: 760 },
  went: { alignItems: 'flex-end', gap: 3 },
  wentText: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.inkSoft },
  peopleNote: { paddingHorizontal: space.gutter, paddingVertical: 14, fontSize: 13.5 },
  // Laptop
  wide: { width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 18 },
  near: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 13, borderRadius: 12, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1.5px ${colors.hairline}` },
  nearText: { fontFamily: fonts.bodyHeavy, fontSize: 13.5, color: colors.ink },
  grid: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  filters: { width: 230, gap: 2 },
  fh: { fontFamily: fonts.bodyHeavy, fontSize: 12.5, letterSpacing: 0.3, color: colors.inkMuted, marginTop: 14, marginBottom: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  checkText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.inkSoft },
  clear: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.primary, marginTop: 16 },
  groupHead: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  table: { backgroundColor: colors.surface, borderRadius: radii.card - 2, overflow: 'hidden', boxShadow: shadows.card },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 18 },
  trLine: { borderTopWidth: 1, borderTopColor: colors.hairline },
  th: { backgroundColor: colors.surfaceSoft, paddingVertical: 10 },
  thText: { fontFamily: fonts.bodyHeavy, fontSize: 12.5, color: colors.inkMuted },
  cPlace: { flex: 2.2, minWidth: 0 },
  cWho: { flex: 1.6, minWidth: 0 },
  whoCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cArea: { flex: 1.4, minWidth: 0 },
  cPrice: { width: 110 },
  pn: { fontFamily: fonts.bodyHeavy, fontSize: 15.5, color: colors.ink },
  price: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
});
