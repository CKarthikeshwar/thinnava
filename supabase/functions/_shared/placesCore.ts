// Shared Google Places plumbing for the places, extract and links functions (spec §25).
// Every Google call is counted by consume_google_quota first (zero-cost lock 1, §27.5).
// With no GOOGLE_PLACES_KEY everything runs on practice fixtures (§25.6).
import { admin } from './http.ts';
import { categoryFor } from './category.ts';
import { distanceM, practiceSearch, type PracticePlace } from './practicePlaces.ts';

export const KEY = Deno.env.get('GOOGLE_PLACES_KEY') ?? '';
export const PRACTICE = !KEY;
export const BLR = { latitude: 12.9716, longitude: 77.5946 };
const G = 'https://places.googleapis.com/v1';

export const BASIC_FIELDS = 'id,displayName,location,shortFormattedAddress,formattedAddress,addressComponents,primaryType,businessStatus';
export const LIST_FIELDS = BASIC_FIELDS.split(',').map((f) => `places.${f}`).join(',');

if (PRACTICE && Deno.env.get('APP_ENV') === 'prod') throw new Error('Practice mode is not allowed in production');

export type LatLng = { latitude: number; longitude: number };
export type PlaceDTO = {
  placeId: string; name: string; area: string | null; address: string | null; lat: number; lng: number;
  primaryType: string | null; category: string | null; businessStatus: string | null; distanceM?: number;
};

/** Counts one Google call against this month's cap; throws 'quota_paused' when the cap is reached. */
export async function quota(sku: string) {
  const { data, error } = await admin().rpc('consume_google_quota', { p_sku: sku });
  if (error) throw error;
  if (!data) throw new Error('quota_paused');
}

/** Per-user daily limit (kinds: 'places', 'extract'). Returns false when today's limit is used up. */
export async function userQuota(userId: string, kind: string, limit: number) {
  const { data } = await admin().rpc('consume_user_quota', { p_user: userId, p_kind: kind, p_limit: limit });
  return Boolean(data);
}

export async function google(path: string, init: RequestInit, fieldMask?: string) {
  const res = await fetch(`${G}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}) },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`google_${res.status}: ${await res.text()}`);
  return await res.json();
}

function areaFrom(components: any[] | undefined): string | null {
  if (!components) return null;
  const pick = (t: string) => components.find((c) => c.types?.includes(t))?.shortText ?? null;
  return pick('sublocality_level_1') ?? pick('neighborhood') ?? pick('sublocality') ?? pick('locality');
}

export function fromGoogle(r: any): PlaceDTO {
  const name = r.displayName?.text ?? 'Unnamed place';
  return {
    placeId: r.id, name, area: areaFrom(r.addressComponents), address: r.shortFormattedAddress ?? r.formattedAddress ?? null,
    lat: r.location?.latitude, lng: r.location?.longitude, primaryType: r.primaryType ?? null,
    category: categoryFor(r.primaryType, name), businessStatus: r.businessStatus ?? null,
  };
}

export function fromPractice(pl: PracticePlace): PlaceDTO {
  return {
    placeId: pl.placeId, name: pl.name, area: pl.area, address: pl.address, lat: pl.lat, lng: pl.lng,
    primaryType: pl.primaryType, category: categoryFor(pl.primaryType, pl.name), businessStatus: pl.businessStatus,
  };
}

const toRow = (p: PlaceDTO) => ({
  place_id: p.placeId, name: p.name, lat: p.lat, lng: p.lng, area: p.area, address: p.address,
  primary_type: p.primaryType, category: p.category, business_status: p.businessStatus, refreshed_at: new Date().toISOString(),
});

export async function upsert(p: PlaceDTO) {
  const { error } = await admin().from('places').upsert(toRow(p));
  if (error) throw error;
  return p;
}

export async function upsertMany(list: PlaceDTO[]) {
  if (list.length) {
    const { error } = await admin().from('places').upsert(list.map(toRow));
    if (error) throw error;
  }
  return list;
}

/** Keyword/text search (Text Search Pro), saved into `places`. `max` caps the results. */
export async function textSearch(query: string, near: LatLng | null, max = 20, radius = 30000): Promise<PlaceDTO[]> {
  if (query.trim().length < 2) return [];
  const at = near ?? BLR;
  const withDistance = (pl: PlaceDTO) => ({ ...pl, distanceM: Math.round(distanceM(at.latitude, at.longitude, pl.lat, pl.lng)) });
  if (PRACTICE) return await upsertMany(practiceSearch(query).slice(0, max).map(fromPractice).map(withDistance));
  await quota('text_search');
  const r = await google('/places:searchText', {
    method: 'POST',
    body: JSON.stringify({ textQuery: query, regionCode: 'in', maxResultCount: max, locationBias: { circle: { center: at, radius } } }),
  }, LIST_FIELDS);
  return await upsertMany((r.places ?? []).map(fromGoogle).map(withDistance));
}
