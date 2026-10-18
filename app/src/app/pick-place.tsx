import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { ListRow, ListSurface, SectionLabel, T, Thumb, TopBar, showSnack } from '@/components';
import { autocomplete, nearbyPlaces, placeDetails, recentPlaces, rememberPlace, type Place, type Suggestion } from '@/features/places/api';
import { CategoryThumb, PlaceRow, PracticeNote, SearchField } from '@/features/places/components';
import { usePicked } from '@/features/places/picked';
import { useNet } from '@/lib/net';
import { newDraftPlace } from '@/lib/drafts';
import { queryClient } from '@/lib/queryClient';
import { FnError } from '@/lib/functions';
import { getNear } from '@/lib/location';
import { History, PencilLine } from 'lucide-react-native';
import { colors, space } from '@/theme';

/**
 * D1 Place picker (spec §14): search Google places, "Near you" first if location is allowed, then "Recently used".
 * Only Google places can be picked. ?for=visit continues to Add visit; ?for=select hands the place back to the
 * form that opened it (features/places/picked.ts); ?for=map centres the map; ?for=draft gives an F6 draft its place;
 * otherwise it opens the place page. Offline it lists places already on the phone and offers "Use '<typed>' for now".
 */
export default function PickPlace() {
  const { for: purpose, q: initial } = useLocalSearchParams<{ for?: string; q?: string }>(); // 'visit' → Add visit · 'select' → back to the form · 'map' → back to the map, centred on it
  const [q, setQ] = useState(initial ?? '');
  const [debounced, setDebounced] = useState('');
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const session = useRef(randomUUID()); // one autocomplete session per visit to this screen (cost control, §25.2)
  const recent = useMemo(recentPlaces, []);
  const online = useNet((s) => s.online);
  // Offline (spec §13): only places already on this device, or a stand-in for what was typed.
  const offlinePlaces = useMemo(() => {
    if (online) return [];
    const cached = queryClient.getQueriesData<Place>({ queryKey: ['place'] }).map(([, d]) => d).filter((d): d is Place => !!d?.placeId && !d.placeId.startsWith('draft:'));
    const all = new Map<string, Place>();
    for (const c of cached) all.set(c.placeId, c);
    for (const r of recent) if (!all.has(r.placeId)) all.set(r.placeId, { placeId: r.placeId, name: r.name, area: r.area, address: null, lat: 0, lng: 0, category: null, businessStatus: null });
    const t = q.trim().toLowerCase();
    return [...all.values()].filter((x) => !t || x.name.toLowerCase().includes(t)).slice(0, 30);
  }, [online, q, recent]);

  useEffect(() => { getNear({ ask: true }).then(setNear); }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const suggestions = useQuery({
    queryKey: ['autocomplete', debounced],
    queryFn: () => autocomplete(debounced, session.current, near),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const nearby = useQuery({
    queryKey: ['nearby', near?.lat.toFixed(3), near?.lng.toFixed(3)],
    queryFn: () => nearbyPlaces(near),
    enabled: !!near && debounced.length < 2,
    staleTime: 10 * 60_000,
  });

  const take = (place: Place) => {
    if (purpose === 'select' || purpose === 'map' || purpose === 'draft') { usePicked.getState().put(place, purpose === 'map' ? 'map' : purpose === 'draft' ? 'draft' : 'select'); router.back(); }
    else if (purpose === 'visit') router.replace({ pathname: '/visit/new', params: { placeId: place.placeId } });
    else router.replace({ pathname: '/place/[placeId]', params: { placeId: place.placeId } });
  };
  /** Offline: a place already on the device (its row in the cache lets the form open without the network). */
  const pickOffline = (place: Place) => {
    if (!queryClient.getQueryData(['place', place.placeId])) queryClient.setQueryData(['place', place.placeId], place);
    take(place);
  };
  /** Offline: "Use '<typed>' for now". The entry stays a draft on this device until F6 gives it a real place. */
  const useTyped = () => {
    const place = newDraftPlace(q.trim());
    queryClient.setQueryData(['place', place.placeId], place);
    take(place);
  };

  const pick = async (placeId: string, name: string) => {
    if (picking) return;
    setPicking(placeId);
    try {
      const place = await placeDetails(placeId, session.current);
      rememberPlace({ placeId: place.placeId, name: place.name, area: place.area });
      take(place);
    } catch (e) {
      showSnack({ text: e instanceof FnError && e.code === 'quota_paused' ? 'Place search is resting until next month.' : `Couldn't open ${name}. Try again.` });
      setPicking(null);
    }
  };

  const searching = debounced.length >= 2;
  const practice = searching ? suggestions.data?.some((s) => s.placeId.startsWith('practice:')) : nearby.data?.some((p) => p.placeId.startsWith('practice:'));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar compact title={purpose === 'select' || purpose === 'draft' ? 'Which place?' : purpose === 'map' ? 'Find on the map' : 'Where did you eat?'} onBack={() => router.back()} />
      <SearchField value={q} onChangeText={setQ} onClear={() => setQ('')} placeholder="Search places" autoFocus />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <ListSurface style={styles.surface}>
          {!online ? (
            <>
              <SectionLabel>Places on this phone</SectionLabel>
              {offlinePlaces.map((p) => <PlaceRow key={p.placeId} place={p} onPress={() => pickOffline(p)} />)}
              {!offlinePlaces.length ? <Message text={q.trim() ? `"${q.trim()}" isn't saved on this phone.` : "You're offline. Places you've opened before show here."} /> : null}
              {q.trim() && purpose !== 'map' && purpose !== 'draft' && purpose ? (
                <ListRow leading={<Thumb><PencilLine size={22} color={colors.primaryStrong} strokeWidth={2} /></Thumb>} title={`Use "${q.trim()}" for now`}
                  subtitle="Saved on this phone as a draft. Pick the real place when you're back online." onPress={useTyped} />
              ) : null}
            </>
          ) : searching ? (
            <>
              {suggestions.isLoading ? <Loading /> : null}
              {suggestions.error ? <Message text={(suggestions.error as Error).message} /> : null}
              {suggestions.data?.length === 0 ? <Message text={`No places found for "${debounced}".`} /> : null}
              {suggestions.data?.map((s: Suggestion) => (
                <ListRow key={s.placeId} leading={<CategoryThumb category={null} />} title={s.name} subtitle={s.secondary}
                  trailing={picking === s.placeId ? <ActivityIndicator color={colors.primary} /> : null}
                  onPress={() => pick(s.placeId, s.name)} />
              ))}
            </>
          ) : (
            <>
              {near ? (
                <>
                  <SectionLabel>Near you</SectionLabel>
                  {nearby.isLoading ? <Loading /> : null}
                  {nearby.data?.map((p: Place) => (
                    <PlaceRow key={p.placeId} place={p} onPress={() => pick(p.placeId, p.name)}
                      trailing={picking === p.placeId ? <ActivityIndicator color={colors.primary} /> : null} />
                  ))}
                </>
              ) : null}
              {recent.length ? (
                <>
                  <SectionLabel>Recently used</SectionLabel>
                  {recent.map((r) => (
                    <ListRow key={r.placeId} leading={<Thumb><History size={22} color={colors.primaryStrong} strokeWidth={2} /></Thumb>} title={r.name} subtitle={r.area ?? ''} onPress={() => pick(r.placeId, r.name)} />
                  ))}
                </>
              ) : null}
              {!near && !recent.length ? <Message text="Type a place name to find it." /> : null}
            </>
          )}
        </ListSurface>
        {practice ? <PracticeNote /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const Loading = () => <View style={styles.pad}><ActivityIndicator color={colors.primary} /></View>;
const Message = ({ text }: { text: string }) => <T variant="body" style={styles.msg}>{text}</T>;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingTop: 12 },
  surface: { minHeight: 300, paddingBottom: 12 },
  pad: { padding: 20 },
  msg: { padding: space.gutter, textAlign: 'center' },
});
