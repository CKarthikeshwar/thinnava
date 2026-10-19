// extract (spec §23, §24): reads a copied or shared message with Gemini and matches each place to OpenStreetMap places.
// The message text is never stored or logged; only counts and latency are logged.
import { fail, ok, requireUser, preflight } from '../_shared/http.ts';
import { extract as runGemini, GeminiError, todayIST, type ExtractItem } from '../_shared/gemini.ts';
import { PRACTICE, osmSearch, upsertMany, fromPractice, userQuota, type LatLng, type PlaceDTO } from '../_shared/placesCore.ts';
import { practiceByName } from '../_shared/practicePlaces.ts';

const USER_DAILY_LIMIT = 40;
const MAX_TEXT = 4000;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);
  const user = await requireUser(req);
  if (!user) return fail('not_signed_in', 'Sign in first', 401);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail('bad_request', 'Expected JSON'); }

  const text = String(body.text ?? '').trim();
  if (!text) return fail('empty', 'Nothing to read');
  if (text.length > MAX_TEXT) return fail('too_long', 'That message is too long to read');
  const near: LatLng | null = typeof body.lat === 'number' && typeof body.lng === 'number' ? { latitude: body.lat, longitude: body.lng } : null;

  if (!(await userQuota(user.id, 'extract', USER_DAILY_LIMIT))) return fail('daily_limit', "You've read a lot of messages today. Fill this one in yourself.", 429);

  const started = Date.now();
  try {
    const today = todayIST();
    const out = await runGemini(text, today);
    const items = out.food_related ? out.places.map((it) => clean(it, today)) : [];
    const withCandidates = [];
    for (const it of items) withCandidates.push({ ...it, candidates: await candidates(it, near) });
    console.log(JSON.stringify({ fn: 'extract', ms: Date.now() - started, chars: text.length, places: withCandidates.length }));
    return ok({ foodRelated: out.food_related && withCandidates.length > 0, items: withCandidates, practice: PRACTICE });
  } catch (e) {
    console.log(JSON.stringify({ fn: 'extract', ms: Date.now() - started, error: (e as Error).message.slice(0, 80) }));
    if (e instanceof GeminiError && e.code === 'ai_busy') return fail('ai_busy', 'Reading is busy right now. Fill it in yourself.', 503);
    return fail('ai_failed', "Couldn't read that. Fill it in yourself.", 502);
  }
});

/** §24.1 step 5: dedupe dishes, drop long ones, keep prices in range, no future dates. */
function clean(it: ExtractItem, today: string) {
  const dishes = (list: string[]) => {
    const seen = new Set<string>();
    return list.map((d) => d.trim().replace(/\s+/g, ' '))
      .filter((d) => d && d.length <= 40 && !seen.has(d.toLowerCase()) && seen.add(d.toLowerCase()))
      .slice(0, 10);
  };
  const price = it.price_per_person != null && it.price_per_person >= 1 && it.price_per_person <= 50000 ? it.price_per_person : null;
  const date = it.visit_date && /^\d{4}-\d{2}-\d{2}$/.test(it.visit_date) && it.visit_date <= today ? it.visit_date : null;
  return {
    place: { name: it.place.name.trim(), area: it.place.area ?? null, city: it.place.city ?? null },
    review: it.review ?? null,
    lovedDishes: dishes(it.liked_dishes),
    dislikedDishes: dishes(it.disliked_dishes),
    pricePerPerson: price,
    visitDate: date,
    confidence: {
      place: it.confidence?.place ?? 0.5,
      review: it.confidence?.review ?? 0.5,
      pricePerPerson: it.confidence?.price_per_person ?? 0.5,
      visitDate: it.confidence?.visit_date ?? 0.5,
    },
  };
}

/**
 * §24.1 step 4: up to 3 candidate places for "<name> <area>", near the device or Bengaluru. Uses OpenStreetMap, not Ola:
 * Ola's terms rule out using its products "in connection with" AI systems, and this step follows Gemini's reading.
 */
async function candidates(it: ReturnType<typeof clean>, near: LatLng | null): Promise<PlaceDTO[]> {
  try {
    if (PRACTICE) return await upsertMany(practiceByName(it.place.name, it.place.area).slice(0, 3).map(fromPractice));
    const withArea = await osmSearch([it.place.name, it.place.area].filter(Boolean).join(' '), near, 3);
    return await upsertMany(withArea.length ? withArea : await osmSearch(it.place.name, near, 3));
  } catch (e) {
    // OpenStreetMap down: the user picks the place by hand.
    if ((e as Error).message !== 'quota_paused') console.log(JSON.stringify({ fn: 'extract', candidates_error: (e as Error).message.slice(0, 80) }));
    return [];
  }
}
