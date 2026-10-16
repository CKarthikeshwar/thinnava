// Gemini client for the extract function (spec §18.2, §24). The key belongs to `thinnava-free`, which has no billing
// account, so only the free tier exists: over the limit Google answers 429 and the app falls back to the manual form.
import { z } from 'npm:zod@3.23.8';

const KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
const FALLBACK = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? '';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const hasGemini = () => !!KEY;

/** §24.3 system prompt (iterate with tools/extraction-eval; record changes in changelog.md). */
export const systemPrompt = (today: string) => `You extract food-place experiences from casual Indian-English chat messages or post captions. Return JSON matching the schema.

1. Only include places that are named.
2. Never invent. If something isn't stated, use null or an empty list.
3. "review" is the overall feeling about the place: clear praise → good; mixed or "decent/ok" → okayish; clear complaint → bad; otherwise null.
4. Put a dish in liked or disliked only if the message says how it was. Dishes that are merely mentioned go nowhere. Keep dish names short, as written.
5. Price is per person in rupees:
   - "~300 each" → 300
   - "500 ish" → 500
   - "1200 for 4" → 300, with low confidence
   - a price with no indication of who it covers → per person, with low confidence
6. Resolve relative dates ("yesterday", "last Sunday") against today = ${today}. If no date is mentioned, use null.
7. Never extract who sent the message or who they went with.
8. If the text isn't about food places, return food_related=false and no places.
9. Confidence is 0–1 per field; below 0.6 means the user should check it.`;

/** §24.2 output schema, in Gemini's OpenAPI subset. */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    food_related: { type: 'BOOLEAN' },
    places: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          place: {
            type: 'OBJECT',
            properties: { name: { type: 'STRING' }, area: { type: 'STRING', nullable: true }, city: { type: 'STRING', nullable: true } },
            required: ['name'],
          },
          review: { type: 'STRING', enum: ['good', 'okayish', 'bad'], nullable: true },
          liked_dishes: { type: 'ARRAY', items: { type: 'STRING' } },
          disliked_dishes: { type: 'ARRAY', items: { type: 'STRING' } },
          price_per_person: { type: 'INTEGER', nullable: true },
          visit_date: { type: 'STRING', nullable: true },
          confidence: {
            type: 'OBJECT',
            properties: { place: { type: 'NUMBER' }, review: { type: 'NUMBER' }, price_per_person: { type: 'NUMBER' }, visit_date: { type: 'NUMBER' } },
          },
        },
        required: ['place', 'liked_dishes', 'disliked_dishes'],
      },
    },
  },
  required: ['food_related', 'places'],
};

const conf = z.number().min(0).max(1).catch(0.5);
const Item = z.object({
  place: z.object({ name: z.string().min(1), area: z.string().nullish(), city: z.string().nullish() }),
  review: z.enum(['good', 'okayish', 'bad']).nullish(),
  liked_dishes: z.array(z.string()).catch([]),
  disliked_dishes: z.array(z.string()).catch([]),
  price_per_person: z.number().int().nullish().catch(null),
  visit_date: z.string().nullish().catch(null),
  confidence: z.object({ place: conf, review: conf, price_per_person: conf, visit_date: conf }).partial().catch({}),
});
export const Extraction = z.object({ food_related: z.boolean(), places: z.array(Item).catch([]) });
export type Extraction = z.infer<typeof Extraction>;
export type ExtractItem = z.infer<typeof Item>;

export class GeminiError extends Error {
  constructor(public code: 'ai_busy' | 'ai_failed', message: string) { super(message); }
}

/** Today in Asia/Kolkata as YYYY-MM-DD. */
export const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

async function call(model: string, text: string, today: string, signal: AbortSignal) {
  return await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(today) }] },
      contents: [{ role: 'user', parts: [{ text: `Today is ${today}.\n\nMessage:\n${text}` }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: 'minimal' },
      },
    }),
  });
}

const HEDGE_AFTER_MS = 5_000;
const TOTAL_MS = 14_000; // the app's D7 timeout is 15 s

/**
 * Runs the extraction (§24.1 step 2–3) at temperature 0, as a hedged request: the main model first; if it hasn't
 * answered within 5 s, or answers with a 5xx/429, the fallback model (separate free allowance) is asked too and the
 * first good answer wins. Everything stops at 14 s so the app's 15 s limit holds.
 * Invalid output → { food_related: false } so the app opens the manual form.
 */
export async function extract(text: string, today = todayIST()): Promise<Extraction> {
  if (!KEY) throw new GeminiError('ai_failed', 'GEMINI_API_KEY is not set');
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), TOTAL_MS);
  const good = (r: Response) => r.ok || (r.status !== 429 && r.status < 500);
  let res: Response | null = null;
  try {
    const main = call(MODEL, text, today, stop.signal);
    const first = await Promise.race([main.catch(() => null), new Promise<'slow'>((r) => setTimeout(() => r('slow'), HEDGE_AFTER_MS))]);
    if (first !== 'slow' && first && (good(first) || !FALLBACK)) {
      res = first;
    } else if (FALLBACK) {
      const backup = call(FALLBACK, text, today, stop.signal);
      const tries = first === 'slow' ? [main, backup] : [backup];
      // First good answer wins; if none is good, keep the last response so the error code (429 → ai_busy) is reported.
      res = await Promise.any(tries.map((t) => t.then((r) => (good(r) ? r : Promise.reject(r)))))
        .catch(async (e: AggregateError) => (e.errors ?? []).find((x: unknown) => x instanceof Response) ?? null);
    } else {
      res = await main.catch(() => null);
    }
  } catch {
    res = null;
  }
  if (!res) { clearTimeout(timer); stop.abort(); throw new GeminiError('ai_failed', 'Gemini did not answer in time'); }
  // Read the winner's body before aborting (the abort would cancel it); the 14 s timer still covers this read.
  const body = res.ok ? await res.json().catch(() => null) : null;
  clearTimeout(timer);
  stop.abort(); // cancel the slower call, if any
  if (res.status === 429) throw new GeminiError('ai_busy', 'Gemini free tier is busy');
  if (!res.ok || !body) throw new GeminiError('ai_failed', `Gemini ${res.status}`);
  const raw = (body.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  try {
    const parsed = Extraction.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { food_related: false, places: [] };
  } catch {
    return { food_related: false, places: [] };
  }
}
