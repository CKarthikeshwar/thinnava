// places (spec §23, §25): the only way the app reaches a place provider.
// Ola Maps for search and details (free monthly allowance, every call counted by consume_google_quota first, zero-cost
// lock 1, §27.5), OpenStreetMap as the backup, and places people add by hand. With no OLA_MAPS_API_KEY it runs in
// practice mode on fixtures (§25.6).
import { admin, fail, ok, requireUser, preflight } from '../_shared/http.ts';
import { distanceM, practiceAutocomplete, practiceById, PRACTICE_PLACES } from '../_shared/practicePlaces.ts';
import {
  autocompletePlaces, BLR, fromOla, fromPractice, locateArea, ola, PRACTICE, quota, textSearch, upsert, upsertMany, userQuota, type PlaceDTO,
} from '../_shared/placesCore.ts';

const USER_DAILY_LIMIT = 300;
const CUSTOM_DAILY_LIMIT = 20;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);
  const user = await requireUser(req);
  if (!user) return fail('not_signed_in', 'Sign in first', 401);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail('bad_request', 'Expected JSON'); }
  const action = String(body.action ?? '');
  const near = typeof body.lat === 'number' && typeof body.lng === 'number' ? { latitude: body.lat as number, longitude: body.lng as number } : null;

  try {
    if (!PRACTICE && !(await userQuota(user.id, 'places', USER_DAILY_LIMIT))) return fail('daily_limit', 'You have searched a lot today. Try again tomorrow.', 429);
    switch (action) {
      case 'autocomplete': return ok(await autocomplete(String(body.input ?? ''), near));
      case 'details': return ok({ place: await details(String(body.placeId ?? '')), practice: PRACTICE });
      case 'google_info': return ok(await placeInfo(String(body.placeId ?? '')));
      case 'nearby': return ok({ places: await nearby(near ?? BLR), practice: PRACTICE });
      case 'search': return ok({ places: await textSearch(String(body.query ?? ''), near), practice: PRACTICE });
      case 'add_custom': {
        if (!(await userQuota(user.id, 'custom_place', CUSTOM_DAILY_LIMIT))) return fail('daily_limit', "You've added a lot of places today. Try again tomorrow.", 429);
        return ok({ place: await addCustom(body) });
      }
      default: return fail('bad_action', 'Unknown action');
    }
  } catch (e) {
    const code = (e as Error).message;
    if (code === 'quota_paused') return fail('quota_paused', 'Place search is resting until next month.', 503);
    if (code === 'not_found') return fail('not_found', 'Place not found', 404);
    if (code === 'bad_name') return fail('bad_name', 'Give the place a name (2 to 80 letters).', 400);
    console.error('places error', code.slice(0, 80));
    return fail('places_error', "Couldn't reach place search. Try again.", 502);
  }
});

// ---------- actions ----------

async function autocomplete(input: string, near: { latitude: number; longitude: number } | null) {
  if (input.trim().length < 2) return { suggestions: [] };
  if (PRACTICE) {
    return { suggestions: practiceAutocomplete(input).map((pl) => ({ placeId: pl.placeId, name: pl.name, secondary: pl.area })), practice: true };
  }
  const list = await autocompletePlaces(input, near);
  return { suggestions: list.map((p) => ({ placeId: p.placeId, name: p.name, secondary: p.area ?? p.address ?? '', category: p.category })), sources: [...new Set(list.map((p) => p.source))] };
}

/** A place we already saved (from a search, a suggestion or someone adding it) costs nothing; otherwise ask Ola. */
async function details(placeId: string): Promise<PlaceDTO> {
  if (!placeId) throw new Error('not_found');
  if (placeId.startsWith('practice:')) {
    const pl = practiceById(placeId);
    if (!pl) throw new Error('not_found');
    return await upsert(fromPractice(pl));
  }
  const { data: row } = await admin().from('places').select('*').eq('place_id', placeId).maybeSingle();
  if (row) {
    return {
      placeId: row.place_id, name: row.name, area: row.area, address: row.address, lat: row.lat, lng: row.lng,
      primaryType: row.primary_type, category: row.category, businessStatus: row.business_status,
      source: placeId.startsWith('ola-') ? 'ola' : placeId.startsWith('osm:') ? 'osm' : placeId.startsWith('custom:') ? 'custom' : undefined,
    };
  }
  if (PRACTICE || !placeId.startsWith('ola-')) throw new Error('not_found');
  await quota('ola_details');
  const r = await ola('/places/v1/details', { place_id: placeId });
  const p = r.result ? fromOla({ ...r.result, place_id: placeId }) : null;
  if (!p) throw new Error('not_found');
  return await upsert(p);
}

/**
 * "More info" on a place page (§25.5): opening hours, phone and website from Ola when it has them. Ola rarely has
 * ratings for Bengaluru restaurants, so ratings only show when present. Same response shape as before.
 */
async function placeInfo(placeId: string) {
  const { data: mode } = await admin().rpc('google_info_mode');
  if (mode === 'off') return { mode: 'off' };
  if (PRACTICE || placeId.startsWith('practice:')) {
    const pl = practiceById(placeId);
    if (!pl) throw new Error('not_found');
    return { mode: 'tap', practice: true, info: { rating: pl.rating, userRatingCount: pl.userRatingCount, priceLevel: pl.priceLevel, openNow: null, hours: [pl.hours], phone: null, website: null } };
  }
  if (!placeId.startsWith('ola-')) return { mode: 'tap', info: { rating: null, userRatingCount: null, priceLevel: null, openNow: null, hours: [], phone: null, website: null } };
  if (!(await admin().rpc('consume_google_quota', { p_sku: 'details_rich' })).data) return { mode: 'off' };
  const r = (await ola('/places/v1/details', { place_id: placeId })).result ?? {};
  const na = (s: unknown) => (typeof s === 'string' && s.trim() && s !== 'NA' ? s.trim() : null);
  const hours: string[] = (r.opening_hours?.weekday_text ?? []).filter((h: string) => na(h) && !/NA/.test(h));
  return {
    mode: 'tap',
    info: {
      rating: typeof r.rating === 'number' && r.rating > 0 ? r.rating : null,
      userRatingCount: typeof r.user_ratings_total === 'number' && r.user_ratings_total > 0 ? r.user_ratings_total : null,
      priceLevel: na(r.price_level),
      openNow: hours.length && typeof r.opening_hours?.open_now === 'boolean' ? r.opening_hours.open_now : null,
      hours,
      phone: na(r.formatted_phone_number) ?? na(r.phone),
      website: na(r.website),
    },
  };
}

/** Food places within ~2 km, nearest first (pick-place "Near you"). Ola text search for "restaurant" around the point. */
async function nearby(at: { latitude: number; longitude: number }) {
  if (PRACTICE) {
    const list = PRACTICE_PLACES.filter((p) => p.businessStatus === 'OPERATIONAL')
      .map((pl) => ({ ...fromPractice(pl), distanceM: Math.round(distanceM(at.latitude, at.longitude, pl.lat, pl.lng)) }))
      .sort((a, b) => a.distanceM! - b.distanceM!)
      .slice(0, 10);
    return await upsertMany(list);
  }
  const list = await textSearch('restaurant', at, 20, 2000);
  return list.filter((p) => (p.distanceM ?? 0) <= 3000).sort((a, b) => a.distanceM! - b.distanceM!).slice(0, 10);
}

/** Our categories → a provider-style type, for places added by hand. */
const TYPE_OF: Record<string, string> = {
  restaurant: 'restaurant', cafe: 'cafe', bakery: 'bakery', fast_food: 'fast_food_restaurant', bar: 'bar', dessert: 'dessert_shop',
  tea_shop: 'tea_house', street_food: 'street_food', dhaba: 'restaurant',
};

/** "Add a place yourself" (§25.7): a name, an optional area and type. Placed roughly at its area for the map. */
async function addCustom(body: Record<string, unknown>): Promise<PlaceDTO> {
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) throw new Error('bad_name');
  const area = String(body.area ?? '').trim().replace(/\s+/g, ' ').slice(0, 60) || null;
  const category = typeof body.category === 'string' && body.category in TYPE_OF ? body.category : 'restaurant';
  const at = await locateArea(area);
  return await upsert({
    placeId: `custom:${crypto.randomUUID()}`, name, area, address: area ? `${area}, Bengaluru` : 'Bengaluru',
    lat: at.latitude, lng: at.longitude, primaryType: TYPE_OF[category], category, businessStatus: null, source: 'custom',
  });
}
