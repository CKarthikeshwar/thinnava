import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { MapPlace } from './api';

/** A map region in react-native-maps' shape (kept here so shared code doesn't import the Android map). */
export type Area = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

export type Item =
  | { kind: 'place'; id: string; lat: number; lng: number; place: MapPlace }
  | { kind: 'cluster'; id: string; lat: number; lng: number; count: number; zoomTo: number };

/** Google's zoom level for a region, from its longitude span. */
export const zoomOf = (r: Area) => Math.max(0, Math.min(20, Math.log2(360 / Math.max(r.longitudeDelta, 1e-6))));
export const deltaFor = (zoom: number) => 360 / 2 ** zoom;

/** Clusters pins in JS with supercluster (spec §26.7). Busy areas become one numbered circle. */
export function useClusters(places: MapPlace[], region: Area): Item[] {
  const index = useMemo(() => {
    const sc = new Supercluster<{ place: MapPlace }>({ radius: 64, maxZoom: 17 });
    sc.load(places.map((p) => ({ type: 'Feature', properties: { place: p }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })));
    return sc;
  }, [places]);
  const zoom = Math.round(zoomOf(region));
  return useMemo(() => {
    const w = region.longitude - region.longitudeDelta / 2, e = region.longitude + region.longitudeDelta / 2;
    const s = region.latitude - region.latitudeDelta / 2, n = region.latitude + region.latitudeDelta / 2;
    return index.getClusters([w, s, e, n], zoom).map((f): Item => {
      const [lng, lat] = f.geometry.coordinates;
      if ('cluster' in f.properties && f.properties.cluster) {
        const id = f.properties.cluster_id;
        return { kind: 'cluster', id: `c${id}`, lat, lng, count: f.properties.point_count, zoomTo: Math.min(index.getClusterExpansionZoom(id), 18) };
      }
      const place = (f.properties as { place: MapPlace }).place;
      return { kind: 'place', id: place.place_id, lat, lng, place };
    });
  }, [index, zoom, region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);
}
