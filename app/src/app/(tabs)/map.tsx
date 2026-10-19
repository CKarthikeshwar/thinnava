import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Layers, LocateFixed, MapPinned, SlidersHorizontal } from 'lucide-react-native';
import { Avatar, Chip, Cluster, IconButton, ListRow, MapPin, NAV_HEIGHT, OfflineStrip, Screen, SearchBar, Sheet, T, type Glyph } from '@/components';
import { CategoryThumb } from '@/features/places/components';
import { CATEGORY_LABEL } from '@/features/places/api';
import { useTakePicked } from '@/features/places/picked';
import { BENGALURU, LAYERS, mapPlaces, NO_FILTERS, type Box, type Layer, type MapFilters, type MapPlace } from '@/features/map/api';
import { deltaFor, useClusters, type Area } from '@/features/map/cluster';
import { FilterSheet, filterCount } from '@/features/map/FilterSheet';
import { PinCard } from '@/features/map/PinCard';
import { GoogleMap, mapsReady, Marker, type MapRef } from '@/platform/map/MapView';
import { getNear } from '@/lib/location';
import { dotJoin } from '@/lib/format';
import { colors, fonts, radii, shadows, space } from '@/theme';
import { useLayoutMode } from '@/lib/layout';

const boxOf = (r: Area): Box => ({
  minLat: r.latitude - r.latitudeDelta / 2, maxLat: r.latitude + r.latitudeDelta / 2,
  minLng: r.longitude - r.longitudeDelta / 2, maxLng: r.longitude + r.longitudeDelta / 2,
});
/** Without the map (no Maps key yet), list everything in and around Bengaluru. */
const WIDE = { ...BENGALURU, latitudeDelta: 0.6, longitudeDelta: 0.6 };
const parseLayers = (s?: string) => (s ? s.split(',').filter((x): x is Layer => LAYERS.some((l) => l.key === x)) : []);

/** Which pin face a place gets: a person who went, else my own ✓, else the layer's glyph (spec §16.6). */
function face(p: MapPlace): { glyph: Glyph; person?: { name: string; uri: string | null } } {
  if (p.people.length) return { glyph: 'went', person: { name: p.people[0].name, uri: p.people[0].avatar } };
  if (p.is_mine) return { glyph: 'went' };
  if (p.layers.includes('wishlist')) return { glyph: 'wishlist' };
  if (p.layers.includes('friends')) return { glyph: 'friend' };
  if (p.layers.includes('internet')) return { glyph: 'internet' };
  return { glyph: 'went' };
}

/** "Anu, Ravi went" · "You went" · "On your wishlist" · "From a friend" · "Found online". */
function whoLine(p: MapPlace) {
  if (p.people.length) return `${p.people.map((x) => x.name.split(' ')[0]).join(', ')}${p.is_mine ? ' and you' : ''} went`;
  if (p.is_mine) return 'You went';
  if (p.layers.includes('wishlist')) return 'On the wishlist';
  if (p.layers.includes('friends')) return 'A friend told you';
  return 'Found online';
}

/**
 * B2 Map (spec §14, §26.7): pins for what I can see in the visible area, grouped when busy; layer chips; B2a filters;
 * "N places here" list sheet; B2b pin card. Opened with ?person=&name= it becomes that connection's map, and with
 * ?layers= (e.g. from a profile tab) it starts on those layers.
 */
export default function MapTab() {
  const params = useLocalSearchParams<{ person?: string; name?: string; layers?: string; scope?: string }>();
  const insets = useSafeAreaInsets();
  const mode = useLayoutMode();
  // Room for the Android bottom bar; the web has none (spec §18.3).
  const navH = mode === 'app' ? NAV_HEIGHT + insets.bottom : 0;
  const map = useRef<MapRef>(null);
  const pinSheet = useRef<BottomSheetModal>(null);
  const filterSheet = useRef<BottomSheetModal>(null);

  const [layers, setLayers] = useState<Layer[]>(parseLayers(params.layers));
  const [filters, setFilters] = useState<MapFilters>({ ...NO_FILTERS, person: params.person ?? null });
  const [scope, setScope] = useState<string | null>(params.scope ?? (params.person && params.name ? `${params.name}'s map` : null));
  useEffect(() => {
    setLayers(parseLayers(params.layers));
    setFilters((f) => ({ ...f, person: params.person ?? null }));
    setScope(params.scope ?? (params.person && params.name ? `${params.name}'s map` : null));
  }, [params.person, params.layers, params.scope, params.name]);
  const personMode = !!params.person && filters.person === params.person;

  const [region, setRegion] = useState<Area>(mapsReady ? BENGALURU : WIDE);
  const [box, setBox] = useState<Box>(boxOf(mapsReady ? BENGALURU : WIDE));
  const [locOk, setLocOk] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onRegion = (r: Area) => {
    setRegion(r);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setBox(boxOf(r)), 500); // §14: panning reloads pins, debounced 500 ms
  };

  // Start near me if location is already allowed (never asks on open; "Locate me" asks via A7).
  useEffect(() => {
    getNear({ ask: false }).then((n) => {
      if (!n) return;
      setLocOk(true);
      if (mapsReady) { const r = { latitude: n.lat, longitude: n.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }; map.current?.animateToRegion(r, 0); onRegion(r); }
    });
  }, []);
  const locate = async () => {
    const n = await getNear({ ask: true });
    if (!n) return;
    setLocOk(true);
    const r = { latitude: n.lat, longitude: n.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 };
    if (mapsReady) map.current?.animateToRegion(r, 400); else { setRegion({ ...r, latitudeDelta: 0.3, longitudeDelta: 0.3 }); setBox(boxOf({ ...r, latitudeDelta: 0.3, longitudeDelta: 0.3 })); }
  };
  const focus = (lat: number, lng: number, delta = 0.02) => {
    const r = { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
    if (mapsReady) map.current?.animateToRegion(r, 400);
  };

  // The search bar picks a place and centres the map on it (§14 B2).
  useTakePicked((p) => focus(p.lat, p.lng, 0.01), 'map');

  const q = useQuery({ queryKey: ['map', box, layers, filters], queryFn: () => mapPlaces(box, layers, filters), placeholderData: keepPreviousData });
  const places = q.data ?? [];
  const items = useClusters(mapsReady ? places : [], region, mode === 'phone' ? 130 : 64);
  const visible = useMemo(() => {
    const b = boxOf(region);
    return places.filter((p) => p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng);
  }, [places, region]);

  const [selected, setSelected] = useState<MapPlace | null>(null);
  const openPin = (p: MapPlace) => { setSelected(p); pinSheet.current?.present(); };

  const chips: { key: string; label: string; on: boolean; tap: () => void }[] = [
    { key: 'all', label: 'All', on: !layers.length, tap: () => setLayers([]) },
    ...LAYERS.filter((l) => !personMode || l.key === 'visited' || l.key === 'wishlist')
      .map((l) => ({ key: l.key, label: l.label, on: layers.length === 1 && layers[0] === l.key, tap: () => setLayers([l.key]) })),
  ];
  const clearScope = () => {
    setScope(null); setLayers([]); setFilters(NO_FILTERS);
    router.setParams({ person: undefined, name: undefined, layers: undefined, scope: undefined });
  };
  const nFilters = filterCount(filters, personMode);

  const top = (
    <View style={styles.top} pointerEvents="box-none">
      <OfflineStrip />
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}><SearchBar placeholder="Search places" onPress={() => mapsReady ? router.push({ pathname: '/pick-place', params: { for: 'map' } }) : router.navigate('/(tabs)/search')} /></View>
        <View>
          <IconButton icon={SlidersHorizontal} label={nFilters ? `Filters, ${nFilters} on` : 'Filters'} badge={!!nFilters} onPress={() => filterSheet.current?.present()} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {scope ? <Chip label={scope} selected removable onPress={clearScope} /> : null}
        {chips.map((c, i) => <Chip key={c.key} label={c.label} icon={i === 0 ? Layers : undefined} selected={c.on && !(scope && !personMode && c.key === 'all' && layers.length > 1)} onPress={c.tap} />)}
      </ScrollView>
    </View>
  );

  const row = (p: MapPlace) => {
    const f = face(p);
    return (
      <ListRow key={p.place_id}
        leading={f.person ? <Avatar name={f.person.name} uri={f.person.uri} size={40} /> : <CategoryThumb category={p.category} />}
        title={p.name} subtitle={dotJoin(p.area, p.category && CATEGORY_LABEL[p.category], whoLine(p))}
        onPress={() => { focus(p.lat, p.lng); openPin(p); }} />
    );
  };
  const empty = q.isSuccess && !places.length
    ? (filters.price || filters.categories.length || layers.length ? 'Nothing matches here. Try another layer or clear the filters.' : personMode ? 'Nothing to show on their map yet.' : 'Your places and your connections\' places show up here.')
    : null;

  // Laptop web (spec §18.3): the list in a panel on the left, the map filling the rest.
  if (mode === 'laptop') {
    const shown = mapsReady ? visible : places;
    return (
      <Screen scroll={false}>
        <View style={styles.desk}>
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <View style={styles.listHead}>
                <T variant="title">{q.isLoading ? 'Loading places…' : shown.length === 1 ? '1 place' : `${shown.length} places`}{mapsReady && !q.isLoading ? ' in view' : ''}</T>
                {q.isFetching ? <ActivityIndicator color={colors.primary} /> : null}
              </View>
              <View style={styles.wrapChips}>
                {scope ? <Chip label={scope} selected removable onPress={clearScope} /> : null}
                {chips.map((c, i) => <Chip key={c.key} label={c.label} icon={i === 0 ? Layers : undefined} selected={c.on && !(scope && !personMode && c.key === 'all' && layers.length > 1)} onPress={c.tap} />)}
                <Chip label={nFilters ? `Filters · ${nFilters}` : 'Filters'} icon={SlidersHorizontal} selected={!!nFilters} onPress={() => filterSheet.current?.present()} />
              </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {shown.map(row)}
              {empty ? <T variant="body" style={styles.empty}>{empty}</T> : null}
            </ScrollView>
          </View>
          <View style={{ flex: 1 }}>
            {mapsReady ? (
              <>
                <GoogleMap ref={map} style={StyleSheet.absoluteFill} initialRegion={BENGALURU} showsUserLocation={locOk}
                  onRegionChangeComplete={onRegion} onPress={() => pinSheet.current?.dismiss()}>
                  {items.map((it) => it.kind === 'cluster' ? (
                    <Marker key={it.id} coordinate={{ latitude: it.lat, longitude: it.lng }} tracksViewChanges={false}
                      onPress={() => focus(it.lat, it.lng, deltaFor(it.zoomTo))}>
                      <Cluster count={it.count} />
                    </Marker>
                  ) : (
                    <Pin key={it.id} place={it.place} selected={selected?.place_id === it.id} onPress={() => openPin(it.place)} />
                  ))}
                </GoogleMap>
                <View style={[styles.locate, { bottom: 24 }]}><IconButton icon={LocateFixed} label="Locate me" onPress={locate} /></View>
              </>
            ) : (
              <View style={styles.noMap}>
                <View style={styles.noMapBox}>
                  <MapPinned size={30} color={colors.primaryStrong} strokeWidth={2} />
                  <T variant="title" style={{ textAlign: 'center' }}>The map is coming soon</T>
                  <T variant="body" style={{ textAlign: 'center' }}>Until then, your places and your people's places are in the list on the left.</T>
                </View>
              </View>
            )}
          </View>
        </View>
        <Sheet ref={pinSheet} onDismiss={() => setSelected(null)}>
          {selected ? <PinCard place={selected} onClose={() => pinSheet.current?.dismiss()} /> : null}
        </Sheet>
        <Sheet ref={filterSheet} title="Filters">
          <FilterSheet value={filters} onChange={setFilters} hidePerson={personMode} />
        </Sheet>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      {mapsReady ? (
        <>
          <GoogleMap ref={map} style={StyleSheet.absoluteFill} initialRegion={BENGALURU} showsUserLocation={locOk}
            onRegionChangeComplete={onRegion} onPress={() => pinSheet.current?.dismiss()}
            mapPadding={{ top: 120, bottom: navH + 70, left: 0, right: 0 }}>
            {items.map((it) => it.kind === 'cluster' ? (
              <Marker key={it.id} coordinate={{ latitude: it.lat, longitude: it.lng }} tracksViewChanges={false}
                onPress={() => focus(it.lat, it.lng, deltaFor(it.zoomTo))}>
                <Cluster count={it.count} />
              </Marker>
            ) : (
              <Pin key={it.id} place={it.place} selected={selected?.place_id === it.id} onPress={() => openPin(it.place)} />
            ))}
          </GoogleMap>
          {top}
          <View style={[styles.locate, { bottom: navH + 84 }]}>
            <IconButton icon={LocateFixed} label="Locate me" onPress={locate} />
          </View>
          <BottomSheet index={0} snapPoints={[64, '50%']} bottomInset={navH} enableDynamicSizing={false}
            backgroundStyle={styles.listBg} handleIndicatorStyle={styles.handle}>
            <View style={styles.listHead}>
              <T variant="title">{q.isLoading ? 'Loading places…' : visible.length === 1 ? '1 place here' : `${visible.length} places here`}</T>
              {q.isFetching ? <ActivityIndicator color={colors.primary} /> : null}
            </View>
            <BottomSheetFlatList data={visible} keyExtractor={(p: MapPlace) => p.place_id} renderItem={({ item }: { item: MapPlace }) => row(item)}
              ListEmptyComponent={empty ? <T variant="body" style={styles.empty}>{empty}</T> : null} contentContainerStyle={{ paddingBottom: 24 }} />
          </BottomSheet>
        </>
      ) : (
        // No Maps key yet (spec §27.5): the same layers, filters and pin card over a plain list.
        <>
          {top}
          <ScrollView contentContainerStyle={{ paddingBottom: navH + 24 }}>
            <View style={styles.notice}>
              <MapPinned size={22} color={colors.primaryStrong} strokeWidth={2} />
              <T variant="body" style={{ flex: 1 }}>The map is coming soon. Until then, here are the same places as a list.</T>
            </View>
            <View style={styles.listHead}>
              <T variant="title">{q.isLoading ? 'Loading places…' : places.length === 1 ? '1 place' : `${places.length} places`}</T>
              {q.isFetching ? <ActivityIndicator color={colors.primary} /> : null}
            </View>
            <View style={styles.plainList}>{places.map(row)}</View>
            {empty ? <T variant="body" style={styles.empty}>{empty}</T> : null}
          </ScrollView>
        </>
      )}

      <Sheet ref={pinSheet} onDismiss={() => setSelected(null)}>
        {selected ? <PinCard place={selected} onClose={() => pinSheet.current?.dismiss()} /> : null}
      </Sheet>
      <Sheet ref={filterSheet} title="Filters">
        <FilterSheet value={filters} onChange={setFilters} hidePerson={personMode} />
      </Sheet>
    </Screen>
  );
}

/** One pin. Custom views are snapshotted on Android, so it re-renders only while its photo loads or selection changes. */
const Pin = memo(function Pin({ place, selected, onPress }: { place: MapPlace; selected: boolean; onPress: () => void }) {
  const [track, setTrack] = useState(true);
  useEffect(() => { setTrack(true); const t = setTimeout(() => setTrack(false), 800); return () => clearTimeout(t); }, [selected]);
  const f = face(place);
  return (
    <Marker coordinate={{ latitude: place.lat, longitude: place.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={track} onPress={onPress}>
      <MapPin label={place.name} person={f.person?.name} personUri={f.person?.uri} glyph={f.glyph} mine={place.is_mine && !f.person} selected={selected} />
    </Marker>
  );
});

const styles = StyleSheet.create({
  top: { paddingTop: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.gutter },
  chips: { gap: 8, paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 4 },
  locate: { position: 'absolute', right: space.gutter },
  listBg: { backgroundColor: colors.surface, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, boxShadow: shadows.card },
  handle: { backgroundColor: colors.hairline, width: 40 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutter, paddingTop: 2, paddingBottom: 8 },
  empty: { textAlign: 'center', padding: 24 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceTint, borderRadius: radii.field + 2, padding: space.md, marginHorizontal: space.gutter, marginTop: 14, marginBottom: 10 },
  desk: { flex: 1, flexDirection: 'row' },
  panel: { width: 420, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.hairline },
  panelHead: { paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline, marginBottom: 4 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.gutter, paddingTop: 6 },
  noMap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  noMapBox: { maxWidth: 420, alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radii.panel, padding: 28, boxShadow: shadows.card },
  plainList: { backgroundColor: colors.surface, borderRadius: radii.card, marginHorizontal: 14, paddingVertical: 4, boxShadow: shadows.card },
});
