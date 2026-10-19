// Shared place plumbing for the places, extract and links functions (spec §25).
// Provider: Ola Maps (free monthly allowance, prepaid-only billing with no credit added, so it can't charge), with
// OpenStreetMap search (Photon, free, no key) as the backup and for reading messages. Every Ola call is counted by
// consume_google_quota first (zero-cost lock 1, §27.5; the name is historical). Without OLA_MAPS_API_KEY everything
// runs on practice fixtures (§25.6).
import { admin } from './http.ts';
import { categoryFor } from './category.ts';
import { distanceM, practiceSearch, type PracticePlace } from './practicePlaces.ts';

export const KEY = Deno.env.get('OLA_MAPS_API_KEY') ?? '';
export const PRACTICE = !KEY;
export const BLR = { latitude: 12.9716, longitude: 77.5946 };
const OLA = 'https://api.olamaps.io';
const PHOTON = 'https://photon.komoot.io/api';
const UA = 'Thinnava/1.0 (student project; thinnava.pages.dev)';

if (PRACTICE && Deno.env.get('APP_ENV') === 'prod') throw new Error('Practice mode is not allowed in production');

export type LatLng = { latitude: number; longitude: number };
export type PlaceDTO = {
  placeId: string; name: string; area: string | null; address: string | null; lat: number; lng: number;
  primaryType: string | null; category: string | null; businessStatus: string | null; distanceM?: number;
  /** Where the place came from, for the credit line under results (Ola Terms §15, OpenStreetMap). */
  source?: 'ola' | 'osm' | 'custom' | 'practice';
};

/** Counts one provider call against this month's cap; throws 'quota_paused' when the cap is reached. */
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

/** One Ola Places call (GET, API key as a query parameter). The key never appears in errors or logs. */
export async function ola(path: string, params: Record<string, string>) {
  const u = new URL(OLA + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('api_key', KEY);
  const res = await fetch(u, { headers: { 'X-Request-Id': crypto.randomUUID() }, signal: AbortSignal.timeout(8000) });
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`ola_${res.status}`);
  return await res.json();
}

const na = (s: unknown) => (typeof s === 'string' && s.trim() && s !== 'NA' ? s.trim() : null);

/** "…, Gandhi Bazaar, Basavanagudi, Bengaluru, Karnataka, 560004, India" → "Basavanagudi" (the part before the city). */
export function areaFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  const city = parts.findIndex((p) => /^(bengaluru|bangalore)$/i.test(p));
  if (city > 0) return parts[city - 1];
  return parts.length > 3 ? parts[parts.length - 4] : null;
}

/** First Ola type that maps to one of our categories (Ola uses Google-style types). */
const categoryOf = (types: string[] | undefined, name: string) => {
  for (const t of types ?? []) { const c = categoryFor(t, name); if (c) return c; }
  return categoryFor(null, name);
};

/** An Ola autocomplete / text-search / details item → our place. Null when it has no location. */
export function fromOla(r: any): PlaceDTO | null {
  const loc = r.geometry?.location;
  if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
  const name = na(r.structured_formatting?.main_text) ?? na(r.name) ?? na(r.description?.split(',')[0]) ?? 'Unnamed place';
  const address = na(r.formatted_address) ?? na(r.description) ?? (na(r.structured_formatting?.secondary_text) ? `${name}, ${r.structured_formatting.secondary_text}` : null);
  return {
    placeId: r.place_id, name, area: areaFromAddress(address), address: address?.replace(/, India$/, '') ?? null,
    lat: loc.lat, lng: loc.lng, primaryType: r.types?.[0] ?? null, category: categoryOf(r.types, name),
    businessStatus: na(r.business_status), source: 'ola',
  };
}

export function fromPractice(pl: PracticePlace): PlaceDTO {
  return {
    placeId: pl.placeId, name: pl.name, area: pl.area, address: pl.address, lat: pl.lat, lng: pl.lng,
    primaryType: pl.primaryType, category: categoryFor(pl.primaryType, pl.name), businessStatus: pl.businessStatus, source: 'practice',
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

const withDistance = (at: LatLng) => (pl: PlaceDTO) => ({ ...pl, distanceM: Math.round(distanceM(at.latitude, at.longitude, pl.lat, pl.lng)) });

/** Ola Text Search only understands "what + kind" ("biryani restaurant"), so a bare food word gets "restaurant". */
function textQuery(q: string) {
  const t = q.trim();
  return t.split(/\s+/).length === 1 && !/(restaurant|cafe|bakery|bar|hotel|dhaba|mess)$/i.test(t) ? `${t} restaurant` : t;
}

/** Keyword search near a point, saved into `places`. Ola first; OpenStreetMap when Ola is paused or down. */
export async function textSearch(query: string, near: LatLng | null, max = 20, radius = 30000): Promise<PlaceDTO[]> {
  if (query.trim().length < 2) return [];
  const at = near ?? BLR;
  if (PRACTICE) return await upsertMany(practiceSearch(query).slice(0, max).map(fromPractice).map(withDistance(at)));
  try {
    await quota('ola_text_search');
    const r = await ola('/places/v1/textsearch', { input: textQuery(query), location: `${at.latitude},${at.longitude}`, radius: String(Math.min(radius, 50000)) });
    const list = (r.predictions ?? []).map(fromOla).filter(Boolean).slice(0, max) as PlaceDTO[];
    return await upsertMany(list.map(withDistance(at)));
  } catch (e) {
    console.log(JSON.stringify({ fn: 'places', ola_text_search: (e as Error).message.slice(0, 60) }));
    return await upsertMany((await osmSearch(query, at, Math.min(max, 10))).map(withDistance(at)));
  }
}

/** Name suggestions while typing. Ola's suggestions already carry the location, so they're saved straight away. */
export async function autocompletePlaces(input: string, near: LatLng | null): Promise<PlaceDTO[]> {
  const at = near ?? BLR;
  try {
    await quota('ola_autocomplete');
    const r = await ola('/places/v1/autocomplete', { input, location: `${at.latitude},${at.longitude}`, radius: '30000' });
    return await upsertMany(((r.predictions ?? []).map(fromOla).filter(Boolean) as PlaceDTO[]).slice(0, 8).map(withDistance(at)));
  } catch (e) {
    console.log(JSON.stringify({ fn: 'places', ola_autocomplete: (e as Error).message.slice(0, 60) }));
    return await upsertMany((await osmSearch(input, at, 6)).map(withDistance(at)));
  }
}

// ---------- OpenStreetMap (Photon): free, no key, fair use ----------

const FOOD = new Set(['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bakery', 'ice_cream', 'food_court', 'biergarten', 'confectionery', 'deli', 'pastry', 'tea', 'coffee']);
const OSM_TYPE: Record<string, string> = { fast_food: 'fast_food_restaurant', pub: 'pub', ice_cream: 'ice_cream_shop', food_court: 'restaurant', confectionery: 'confectionery', pastry: 'bakery', tea: 'tea_house', coffee: 'cafe' };

/** OpenStreetMap search for food places near a point (used for reading messages, and as Ola's backup). */
export async function osmSearch(query: string, near: LatLng | null, max = 5): Promise<PlaceDTO[]> {
  const at = near ?? BLR;
  const u = new URL(PHOTON);
  u.searchParams.set('q', query);
  u.searchParams.set('lat', String(at.latitude));
  u.searchParams.set('lon', String(at.longitude));
  u.searchParams.set('limit', '15');
  const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`osm_${res.status}`);
  const out: PlaceDTO[] = [];
  for (const f of (await res.json()).features ?? []) {
    const p = f.properties ?? {};
    if (!FOOD.has(p.osm_value) || !p.name) continue;
    const [lng, lat] = f.geometry?.coordinates ?? [];
    if (typeof lat !== 'number' || distanceM(at.latitude, at.longitude, lat, lng) > 60000) continue;
    const type = OSM_TYPE[p.osm_value] ?? p.osm_value;
    const area = p.district ?? p.locality ?? p.suburb ?? null;
    out.push({
      placeId: `osm:${p.osm_type}${p.osm_id}`, name: p.name, area, address: [p.street, area, p.city].filter(Boolean).join(', ') || null,
      lat, lng, primaryType: type, category: categoryFor(type, p.name), businessStatus: null, source: 'osm',
    });
    if (out.length >= max) break;
  }
  return out;
}

/** Rough location for a place someone adds by hand: its area in Bengaluru, else the city centre. */
export async function locateArea(area: string | null): Promise<LatLng> {
  if (!area?.trim()) return BLR;
  try {
    const u = new URL(PHOTON);
    u.searchParams.set('q', `${area}, Bengaluru`);
    u.searchParams.set('lat', String(BLR.latitude));
    u.searchParams.set('lon', String(BLR.longitude));
    u.searchParams.set('limit', '1');
    const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
    const [lng, lat] = (await res.json()).features?.[0]?.geometry?.coordinates ?? [];
    if (typeof lat === 'number' && distanceM(BLR.latitude, BLR.longitude, lat, lng) < 60000) return { latitude: lat, longitude: lng };
  } catch { /* fall back to the city centre */ }
  return BLR;
}
