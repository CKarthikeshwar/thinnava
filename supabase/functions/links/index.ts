// links (spec §10.1, §23): resolves a shared or copied link.
// maps → the place (text search through consume_google_quota) · instagram / youtube → kind only (the user pastes the caption)
// · other (incl. Zomato / District / Swiggy) → page title + description for extract. GET, browser user agent, 5 s.
import { fail, ok, requireUser, preflight } from '../_shared/http.ts';
import { fromPractice, PRACTICE, textSearch, upsertMany, userQuota, type PlaceDTO } from '../_shared/placesCore.ts';
import { practiceByName } from '../_shared/practicePlaces.ts';

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const MAX_HOPS = 5;
const MAX_BYTES = 512 * 1024;
const USER_DAILY_LIMIT = 300; // shares the Places budget with the places function

type Kind = 'maps' | 'instagram' | 'youtube' | 'other';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);
  const user = await requireUser(req);
  if (!user) return fail('not_signed_in', 'Sign in first', 401);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail('bad_request', 'Expected JSON'); }
  const input = String(body.url ?? '').trim();
  if (!safeUrl(input)) return fail('bad_url', "That link can't be opened");

  try {
    const first = kindOf(new URL(input));
    // Instagram and YouTube: no fetch needed (and they block bots); the user pastes the caption.
    if (first === 'instagram' || first === 'youtube') return ok({ kind: first, resolvedUrl: input });

    const { finalUrl, html } = await follow(input, first !== 'maps');
    const kind = kindOf(new URL(finalUrl));
    if (kind === 'maps') {
      if (!PRACTICE && !(await userQuota(user.id, 'places', USER_DAILY_LIMIT))) return ok({ kind, resolvedUrl: finalUrl });
      return ok({ kind, resolvedUrl: finalUrl, suggestion: await mapsPlace(finalUrl) });
    }
    if (kind === 'instagram' || kind === 'youtube') return ok({ kind, resolvedUrl: finalUrl });
    return ok({ kind: 'other', resolvedUrl: finalUrl, meta: { ...(html ? meta(html) : { title: null, description: null }), hint: slugHint(new URL(finalUrl)) } });
  } catch (e) {
    console.log(JSON.stringify({ fn: 'links', error: (e as Error).message.slice(0, 80) }));
    // Unreachable page: still usable as an internet entry with the link kept.
    return ok({ kind: kindOf(new URL(input)), resolvedUrl: input });
  }
});

function kindOf(u: URL): Kind {
  const h = u.hostname.replace(/^www\.|^m\./, '');
  if (h === 'maps.app.goo.gl' || (h === 'goo.gl' && u.pathname.startsWith('/maps')) || ((h === 'google.com' || h.startsWith('google.')) && u.pathname.startsWith('/maps')) || h === 'maps.google.com') return 'maps';
  if (h === 'instagram.com' || h === 'instagr.am') return 'instagram';
  if (h === 'youtube.com' || h === 'youtu.be' || h === 'music.youtube.com') return 'youtube';
  return 'other';
}

/** Only public http(s) hosts: no IP literals in private ranges, no localhost (keeps the function from probing internal services). */
function safeUrl(s: string) {
  let u: URL;
  try { u = new URL(s); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^\[?[0-9a-f:]+\]?$/.test(h) && h.includes(':')) return false; // IPv6 literal
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false;
  }
  return true;
}

/** Follows redirects by hand (each hop re-checked), then reads up to 512 KB of HTML when asked. */
async function follow(start: string, wantHtml: boolean) {
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, signal: AbortSignal.timeout(5000) });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      await res.body?.cancel();
      const next = new URL(loc, url).toString();
      if (!safeUrl(next)) throw new Error('unsafe_redirect');
      url = next;
      continue;
    }
    if (!wantHtml || !(res.headers.get('content-type') ?? '').includes('html')) {
      await res.body?.cancel();
      return { finalUrl: url, html: '' };
    }
    return { finalUrl: url, html: await readCapped(res) };
  }
  throw new Error('too_many_redirects');
}

async function readCapped(res: Response) {
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel();
  return new TextDecoder().decode(chunks.length === 1 ? chunks[0] : new Uint8Array(chunks.flatMap((c) => [...c])));
}

/**
 * Zomato / Swiggy / District pages are rendered by script, so their HTML title is generic. Their URL slug carries the
 * restaurant name and area ("meghana-foods-residency-road-bangalore-12345" → "meghana foods residency road bangalore").
 */
function slugHint(u: URL): string | null {
  const h = u.hostname.replace(/^www\./, '');
  if (!/(^|\.)(zomato\.com|swiggy\.com|district\.in)$/.test(h)) return null;
  const seg = u.pathname.split('/').filter(Boolean).find((s) => /[a-z]-[a-z]/i.test(s) && s.length > 6);
  if (!seg) return null;
  return seg.replace(/-\d+$/, '').replace(/-rid-\d+$/, '').replace(/-/g, ' ').trim() || null;
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

function meta(html: string) {
  const pick = (re: RegExp) => { const m = html.match(re); return m ? decode(m[1]).slice(0, 300) : null; };
  const title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
    ?? pick(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i)
    ?? pick(/<title[^>]*>([^<]*)<\/title>/i);
  const description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
    ?? pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return { title, description };
}

/** A Maps link → the best Google place: the name from /maps/place/<name>/ or ?q=, biased to @lat,lng when present. */
async function mapsPlace(finalUrl: string): Promise<PlaceDTO | null> {
  const u = new URL(finalUrl);
  const fromPath = u.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
  const name = decodeURIComponent((fromPath ?? u.searchParams.get('q') ?? u.searchParams.get('query') ?? '').replace(/\+/g, ' ')).trim();
  if (!name) return null;
  const at = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const near = at ? { latitude: Number(at[1]), longitude: Number(at[2]) } : null;
  if (PRACTICE) return (await upsertMany(practiceByName(name.split(',')[0]).slice(0, 1).map(fromPractice)))[0] ?? null;
  return (await textSearch(name, near, 1, near ? 2000 : 50000))[0] ?? null;
}
