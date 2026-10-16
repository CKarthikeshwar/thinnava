// push (spec §12, §23, §26.9): called by the notifications INSERT trigger with the new row. Checks the shared secret,
// builds the §12 text, sends one Expo push per device token, and deletes tokens Expo reports as DeviceNotRegistered.
// Expo's push service is free; it forwards to FCM (Firebase `thinnava-f44c7`, Spark plan, no billing).
import { admin, fail, ok } from '../_shared/http.ts';

const SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';
const EXPO_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

type Row = { id: string; recipient: string; type: string; actor: string | null; visit_id: string | null; tag_id: string | null };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);
  if (!SECRET || req.headers.get('x-push-secret') !== SECRET) return fail('forbidden', 'Bad secret', 403);
  let row: Row;
  try { row = (await req.json()).record; } catch { return fail('bad_request', 'Expected JSON'); }
  if (!row?.recipient) return fail('bad_request', 'No record');

  const db = admin();
  const { data: tokens } = await db.from('push_tokens').select('token').eq('user_id', row.recipient);
  if (!tokens?.length) return ok({ sent: 0 });

  const { data: actor } = row.actor ? await db.from('profiles').select('display_name').eq('id', row.actor).maybeSingle() : { data: null };
  let place: string | null = null;
  if (row.visit_id) {
    const { data: v } = await db.from('visits').select('places(name)').eq('id', row.visit_id).maybeSingle();
    place = (v as { places?: { name?: string } } | null)?.places?.name ?? null;
  }
  const who = (actor?.display_name ?? 'Someone').split(' ')[0];
  const at = place ?? 'a place';
  const msg: Record<string, { body: string; route: string }> = {
    connect_request: { body: `${who} wants to connect`, route: `/people/${row.actor}` },
    connect_accepted: { body: `${who} accepted your request`, route: `/people/${row.actor}` },
    tag_request: { body: `${who} tagged you at ${at}`, route: `/tag/${row.tag_id}` },
    connection_visited: { body: `${who} visited ${at}`, route: `/entry/visit/${row.visit_id}` },
    wishlist_visited: { body: `${who} visited ${at}, a place on your wishlist`, route: `/entry/visit/${row.visit_id}` },
  };
  const m = msg[row.type];
  if (!m) return ok({ sent: 0 });

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(EXPO_TOKEN ? { Authorization: `Bearer ${EXPO_TOKEN}` } : {}) },
    body: JSON.stringify(tokens.map((t) => ({ to: t.token, title: 'Thinnava', body: m.body, data: { route: m.route }, channelId: 'default', sound: 'default' }))),
    signal: AbortSignal.timeout(8000),
  });
  const out = await res.json().catch(() => null);
  // Drop tokens of uninstalled apps (§23).
  const dead = (out?.data ?? []).map((r: { status?: string; details?: { error?: string } }, i: number) =>
    r?.details?.error === 'DeviceNotRegistered' ? tokens[i].token : null).filter(Boolean);
  if (dead.length) await db.from('push_tokens').delete().in('token', dead);
  console.log(JSON.stringify({ fn: 'push', type: row.type, devices: tokens.length, http: res.status, dead: dead.length }));
  return ok({ sent: tokens.length });
});
