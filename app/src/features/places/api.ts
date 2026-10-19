import { callFunction } from '@/lib/functions';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { draftPlaceName, isDraftPlace } from '@/lib/drafts';

export type Category = 'restaurant' | 'cafe' | 'bakery' | 'dhaba' | 'tea_shop' | 'fast_food' | 'dessert' | 'bar' | 'street_food' | 'delivery_only';

export type Place = {
  placeId: string;
  name: string;
  area: string | null;
  address: string | null;
  lat: number;
  lng: number;
  category: Category | null;
  businessStatus: string | null;
  distanceM?: number;
};

export type Suggestion = { placeId: string; name: string; secondary: string; category?: Category | null };
/** "More info" on a place page (§25.5), from Ola Maps. Ratings are rare for Bengaluru places; phone and website when known. */
export type GoogleInfo = { rating: number | null; userRatingCount: number | null; priceLevel: string | null; openNow: boolean | null; hours: string[]; phone?: string | null; website?: string | null };
export type Near = { lat: number; lng: number } | null;

export const CATEGORY_LABEL: Record<Category, string> = {
  restaurant: 'Restaurant', cafe: 'Café', bakery: 'Bakery', dhaba: 'Dhaba', tea_shop: 'Tea shop', fast_food: 'Fast food',
  dessert: 'Dessert', bar: 'Bar', street_food: 'Street food', delivery_only: 'Delivery-only',
};

export const isClosed = (p: Pick<Place, 'businessStatus'>) => p.businessStatus === 'CLOSED_PERMANENTLY';
export const isPractice = (placeId: string) => placeId.startsWith('practice:');
export const isCustom = (placeId: string) => placeId.startsWith('custom:');

// ---- places Edge Function (spec §23) ----
export async function autocomplete(input: string, sessionToken: string, near: Near) {
  const r = await callFunction<{ suggestions: Suggestion[] }>('places', { action: 'autocomplete', input, sessionToken, ...(near ?? {}) });
  return r.suggestions;
}

export async function placeDetails(placeId: string, sessionToken?: string) {
  const r = await callFunction<{ place: Place }>('places', { action: 'details', placeId, sessionToken });
  return r.place;
}

export async function nearbyPlaces(near: Near) {
  const r = await callFunction<{ places: Place[] }>('places', { action: 'nearby', ...(near ?? {}) });
  return r.places;
}

export async function searchPlaces(query: string, near: Near) {
  const r = await callFunction<{ places: Place[] }>('places', { action: 'search', query, ...(near ?? {}) });
  return r.places;
}

/** "Add a place yourself" (spec §25.7): a place no search knows. Placed roughly at its area for the map. */
export async function addCustomPlace(name: string, area: string, category: Category) {
  const r = await callFunction<{ place: Place }>('places', { action: 'add_custom', name, area, category });
  return r.place;
}

export async function googleInfo(placeId: string) {
  return await callFunction<{ mode: 'tap' | 'off'; practice?: boolean; info?: GoogleInfo }>('places', { action: 'google_info', placeId });
}

export async function googleInfoMode(): Promise<'tap' | 'off'> {
  const { data } = await supabase.rpc('google_info_mode');
  return data === 'off' ? 'off' : 'tap';
}

/** A place from our own table (no provider call); falls back to the places function if we've never seen it. */
export async function getPlace(placeId: string): Promise<Place> {
  // A stand-in place typed offline (spec §13) only exists on this device.
  if (isDraftPlace(placeId)) return { placeId, name: draftPlaceName(placeId), area: null, address: null, lat: 0, lng: 0, category: null, businessStatus: null };
  const { data, error } = await supabase.from('places').select('*').eq('place_id', placeId).maybeSingle();
  if (error) throw error;
  if (!data) return await placeDetails(placeId);
  return {
    placeId: data.place_id, name: data.name, area: data.area, address: data.address, lat: data.lat, lng: data.lng,
    category: data.category, businessStatus: data.business_status,
  };
}

/** Places already in Thinnava matching a name (for typing in Search before Ola suggestions). */
export async function knownPlacesByName(q: string): Promise<Place[]> {
  if (q.trim().length < 2) return [];
  const { data } = await supabase.from('places').select('*').ilike('name', `%${q.trim()}%`).limit(5);
  return (data ?? []).map((d) => ({
    placeId: d.place_id, name: d.name, area: d.area, address: d.address, lat: d.lat, lng: d.lng, category: d.category, businessStatus: d.business_status,
  }));
}

// ---- recently opened places (on the device) ----
const RECENT_KEY = 'recent_places';
export type RecentPlace = Pick<Place, 'placeId' | 'name' | 'area'>;

export function recentPlaces(): RecentPlace[] {
  try { return JSON.parse(storage.getString(RECENT_KEY) ?? '[]'); } catch { return []; }
}

export function rememberPlace(p: RecentPlace) {
  const list = [p, ...recentPlaces().filter((r) => r.placeId !== p.placeId)].slice(0, 8);
  storage.set(RECENT_KEY, JSON.stringify(list));
}
