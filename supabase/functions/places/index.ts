// places (spec §23, §25): the only way the app reaches Google Places.
// Every Google call is counted by consume_google_quota first (zero-cost lock 1, §27.5).
// With no GOOGLE_PLACES_KEY it runs in practice mode on fixtures (§25.6).
import { admin, fail, ok, requireUser, preflight } from '../_shared/http.ts';
import { distanceM, practiceAutocomplete, practiceById, PRACTICE_PLACES } from '../_shared/practicePlaces.ts';
import {
  BASIC_FIELDS, BLR, fromGoogle, fromPractice, google, LIST_FIELDS, PRACTICE, quota, textSearch, upsert, upsertMany, userQuota, type PlaceDTO,
} from '../_shared/placesCore.ts';

const USER_DAILY_LIMIT = 300;
const RICH_FIELDS = 'rating,userRatingCount,priceLevel,regularOpeningHours,currentOpeningHours';

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
      case 'autocomplete': return ok(await autocomplete(String(body.input ?? ''), String(body.sessionToken ?? ''), near));
      case 'details': return ok({ place: await details(String(body.placeId ?? ''), body.sessionToken as string | undefined), practice: PRACTICE });
      case 'google_info': return ok(await googleInfo(String(body.placeId ?? '')));
      case 'nearby': return ok({ places: await nearby(near ?? BLR), practice: PRACTICE });
      case 'search': return ok({ places: await textSearch(String(body.query ?? ''), near), practice: PRACTICE });
      default: return fail('bad_action', 'Unknown action');
    }
  } catch (e) {
    const code = (e as Error).message;
    if (code === 'quota_paused') return fail('quota_paused', 'Place search is resting until next month.', 503);
    if (code === 'not_found') return fail('not_found', 'Place not found', 404);
    console.error('places error', e);
    return fail('places_error', "Couldn't reach Google Places. Try again.", 502);
  }
});

// ---------- actions ----------

async function autocomplete(input: string, sessionToken: string, near: { latitude: number; longitude: number } | null) {
  if (input.trim().length < 2) return { suggestions: [] };
  if (PRACTICE) {
    return { suggestions: practiceAutocomplete(input).map((pl) => ({ placeId: pl.placeId, name: pl.name, secondary: pl.area })), practice: true };
  }
  await quota('autocomplete');
  const r = await google('/places:autocomplete', {
    method: 'POST',
    body: JSON.stringify({ input, sessionToken, includedRegionCodes: ['in'], locationBias: { circle: { center: near ?? BLR, radius: 30000 } } }),
  });
  const suggestions = (r.suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({ placeId: p.placeId, name: p.structuredFormat?.mainText?.text ?? p.text?.text, secondary: p.structuredFormat?.secondaryText?.text ?? '' }));
  return { suggestions };
}

async function details(placeId: string, sessionToken?: string): Promise<PlaceDTO> {
  if (!placeId) throw new Error('not_found');
  if (PRACTICE || placeId.startsWith('practice:')) {
    const pl = practiceById(placeId);
    if (!pl) throw new Error('not_found');
    return await upsert(fromPractice(pl));
  }
  await quota('details');
  const qs = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  const r = await google(`/places/${encodeURIComponent(placeId)}${qs}`, { method: 'GET' }, BASIC_FIELDS);
  return await upsert(fromGoogle(r));
}

async function googleInfo(placeId: string) {
  const { data: mode } = await admin().rpc('google_info_mode');
  if (mode === 'off') return { mode: 'off' };
  if (PRACTICE || placeId.startsWith('practice:')) {
    const pl = practiceById(placeId);
    if (!pl) throw new Error('not_found');
    return { mode: 'tap', practice: true, info: { rating: pl.rating, userRatingCount: pl.userRatingCount, priceLevel: pl.priceLevel, openNow: null, hours: [pl.hours] } };
  }
  if (!(await admin().rpc('consume_google_quota', { p_sku: 'details_rich' })).data) return { mode: 'off' };
  const r = await google(`/places/${encodeURIComponent(placeId)}`, { method: 'GET' }, RICH_FIELDS);
  return {
    mode: 'tap',
    info: {
      rating: r.rating ?? null,
      userRatingCount: r.userRatingCount ?? null,
      priceLevel: r.priceLevel ?? null,
      openNow: r.currentOpeningHours?.openNow ?? null,
      hours: r.regularOpeningHours?.weekdayDescriptions ?? [],
    },
  };
}

async function nearby(at: { latitude: number; longitude: number }) {
  if (PRACTICE) {
    const list = PRACTICE_PLACES.filter((p) => p.businessStatus === 'OPERATIONAL')
      .map((pl) => ({ ...fromPractice(pl), distanceM: Math.round(distanceM(at.latitude, at.longitude, pl.lat, pl.lng)) }))
      .sort((a, b) => a.distanceM! - b.distanceM!)
      .slice(0, 10);
    return await upsertMany(list);
  }
  await quota('nearby');
  const r = await google('/places:searchNearby', {
    method: 'POST',
    body: JSON.stringify({
      includedTypes: ['restaurant', 'cafe', 'bakery', 'bar', 'meal_takeaway'],
      maxResultCount: 10, rankPreference: 'DISTANCE',
      locationRestriction: { circle: { center: at, radius: 2000 } },
    }),
  }, LIST_FIELDS);
  const list = (r.places ?? []).map(fromGoogle).map((pl: PlaceDTO) => ({ ...pl, distanceM: Math.round(distanceM(at.latitude, at.longitude, pl.lat, pl.lng)) }));
  return await upsertMany(list);
}
