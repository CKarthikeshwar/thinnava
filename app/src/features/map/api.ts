import { supabase } from '@/lib/supabase';
import type { Category } from '@/features/places/api';
import type { PriceKey } from '@/features/people/api';

/** Map layers (spec §14 B2). An empty list means All. */
export type Layer = 'visited' | 'wishlist' | 'connections' | 'friends' | 'internet';
export const LAYERS: { key: Layer; label: string }[] = [
  { key: 'visited', label: 'Visited' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'connections', label: 'Connections' },
  { key: 'friends', label: 'Friends' },
  { key: 'internet', label: 'Internet' },
];

export type MapPlace = {
  place_id: string; name: string; area: string | null; category: Category | null; lat: number; lng: number;
  layers: Layer[]; people: { id: string; name: string; avatar: string | null }[]; is_mine: boolean;
};

export type Box = { minLat: number; minLng: number; maxLat: number; maxLng: number };
export type MapFilters = { price: PriceKey | null; categories: Category[]; person: string | null };
export const NO_FILTERS: MapFilters = { price: null, categories: [], person: null };

/** Pins for the visible box (spec §22.5 `map_places`): only what I may see, at most 300, newest first. */
export async function mapPlaces(box: Box, layers: Layer[], f: MapFilters): Promise<MapPlace[]> {
  const { data, error } = await supabase.rpc('map_places', {
    p_min_lat: box.minLat, p_min_lng: box.minLng, p_max_lat: box.maxLat, p_max_lng: box.maxLng,
    p_layers: layers.length ? layers : null, p_price: f.price, p_categories: f.categories.length ? f.categories : null, p_person: f.person,
  });
  if (error) throw error;
  return (data ?? []) as MapPlace[];
}

/** Bengaluru, for when location isn't allowed (spec §14 B2). */
export const BENGALURU = { latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.12, longitudeDelta: 0.12 };
