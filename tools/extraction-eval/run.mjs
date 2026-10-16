// Extraction eval (spec §24.4): runs every message in messages.json through the real `extract` function
// (local sandbox by default) and scores it against the pass bar. Run after any prompt or model change and
// record the results in changelog.md.
//
//   node tools/extraction-eval/run.mjs            (needs `npm run backend` + `npm run backend:functions` in app/)
//
// Env: EVAL_URL (default http://127.0.0.1:54321), EVAL_KEY (publishable key; read from app/.env if unset),
//      EVAL_EMAIL / EVAL_PASSWORD (default: the sandbox-only test user), EVAL_DELAY_MS (default 7000, free-tier pacing).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appEnv = (() => { try { return readFileSync(join(here, '../../app/.env'), 'utf8'); } catch { return ''; } })();
const fromAppEnv = (name) => appEnv.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim();

const URL_ = process.env.EVAL_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.EVAL_KEY ?? fromAppEnv('EXPO_PUBLIC_SUPABASE_KEY') ?? fromAppEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? fromAppEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const EMAIL = process.env.EVAL_EMAIL ?? 'tester@thinnava.local';
const PASSWORD = process.env.EVAL_PASSWORD ?? 'practice-pass-123';
const DELAY = Number(process.env.EVAL_DELAY_MS ?? 7000);
const BAR = { place: 0.9, invented: 0, review: 0.8, price: 0.85, nonFood: 1 };

const messages = JSON.parse(readFileSync(join(here, 'messages.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/** Names match when one contains the other ("Meghana" ~ "Meghana Foods", "Third Wave" ~ "Third Wave Coffee"). */
const sameName = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x.includes(y) || y.includes(x)); };
/** A dish is "invented" when none of its words appear in the message. */
const invented = (dish, text) => !norm(dish).split(' ').some((w) => w.length > 2 && norm(text).includes(w));

async function signIn() {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign-in failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

async function extract(token, text) {
  const started = Date.now();
  const r = await fetch(`${URL_}/functions/v1/extract`, {
    method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
  });
  const j = await r.json();
  return { ms: Date.now() - started, ...j };
}

const token = await signIn();
const t = { placeOk: 0, placeN: 0, reviewOk: 0, reviewN: 0, priceOk: 0, priceN: 0, invented: 0, nonFoodOk: 0, nonFoodN: 0, errors: 0, retried: 0, ms: [] };
const rows = [];

for (const m of messages) {
  let res = await extract(token, m.text);
  // Google's free tier sometimes answers 503 / times out; that's availability, not quality. Retry once so every message is scored.
  if (!res.ok) { t.retried++; await sleep(15000); res = await extract(token, m.text); }
  if (!res.ok) {
    // Still failing: counts as a miss on every check it would have had.
    if (m.food) { t.placeN++; t.reviewN += m.places.length; t.priceN += m.places.length; } else t.nonFoodN++;
    t.errors++; rows.push({ id: m.id, error: res.error?.code }); console.log(`#${m.id} ERROR ${res.error?.code}`); await sleep(DELAY); continue;
  }
  t.ms.push(res.ms);
  const items = res.data.items ?? [];
  const notes = [];
  if (!m.food) {
    t.nonFoodN++;
    if (!res.data.foodRelated && items.length === 0) t.nonFoodOk++; else notes.push(`not rejected: ${items.map((i) => i.place.name).join(', ')}`);
  } else {
    // Place names: the message passes when every expected place is found and nothing extra is added.
    t.placeN++;
    const matched = m.places.map((e) => items.find((i) => sameName(i.place.name, e.name)));
    const extra = items.filter((i) => !m.places.some((e) => sameName(i.place.name, e.name)));
    if (matched.every(Boolean) && extra.length === 0) t.placeOk++;
    else notes.push(`places: got [${items.map((i) => i.place.name).join(', ')}] want [${m.places.map((p) => p.name).join(', ')}]`);
    m.places.forEach((e, k) => {
      const got = matched[k];
      t.reviewN++; t.priceN++;
      if ((got?.review ?? null) === e.review) t.reviewOk++; else notes.push(`${e.name} review: got ${got?.review ?? null} want ${e.review}`);
      if ((got?.pricePerPerson ?? null) === e.price) t.priceOk++; else notes.push(`${e.name} price: got ${got?.pricePerPerson ?? null} want ${e.price}`);
    });
  }
  for (const i of items) for (const d of [...i.lovedDishes, ...i.dislikedDishes]) if (invented(d, m.text)) { t.invented++; notes.push(`invented dish: ${d}`); }
  rows.push({ id: m.id, ms: res.ms, notes });
  console.log(`#${m.id} ${res.ms}ms ${notes.length ? notes.join(' | ') : 'ok'}`);
  await sleep(DELAY);
}

const pct = (a, b) => (b ? a / b : 1);
const score = {
  place: pct(t.placeOk, t.placeN), review: pct(t.reviewOk, t.reviewN), price: pct(t.priceOk, t.priceN),
  invented: t.invented, nonFood: pct(t.nonFoodOk, t.nonFoodN), errors: t.errors,
  medianMs: t.ms.sort((a, b) => a - b)[Math.floor(t.ms.length / 2)] ?? null,
};
// Pass bar = §24.4 quality checks. Errors after one retry are reported (availability) but scored as misses above.
const pass = score.place >= BAR.place && score.invented <= BAR.invented && score.review >= BAR.review && score.price >= BAR.price && score.nonFood >= BAR.nonFood;
const f = (x) => `${Math.round(x * 100)}%`;
console.log('\n--- Result ---');
console.log(`Place names   ${f(score.place)}  (bar ≥ 90%)`);
console.log(`Invented dish ${score.invented}     (bar 0)`);
console.log(`Review        ${f(score.review)}  (bar ≥ 80%)`);
console.log(`Price         ${f(score.price)}  (bar ≥ 85%)`);
console.log(`Non-food      ${f(score.nonFood)} (bar 100%)`);
console.log(`Availability: ${t.retried} first-try failures (Google 503/timeout), ${t.errors} still failing after a retry · median ${score.medianMs} ms · ${messages.length} messages`);
console.log(pass ? 'PASS' : 'FAIL');
writeFileSync(join(here, 'last-run.json'), JSON.stringify({ at: new Date().toISOString(), score, pass, rows }, null, 2));
process.exit(pass ? 0 : 1);
