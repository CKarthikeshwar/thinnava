// Shared helpers for Edge Functions (spec §23): JSON responses in the { ok, data } / { ok, error } shape, and auth.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

// The web version (spec §18.3) calls these from a browser. Any origin is fine: requests are authorised by the
// user's bearer token, never by cookies, so a foreign page gains nothing it couldn't do without CORS.
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

/** The browser's CORS preflight: answer it before anything else. */
export const preflight = (req: Request) => (req.method === 'OPTIONS' ? new Response('ok', { headers: CORS }) : null);

export const ok = (data: unknown = {}) => json({ ok: true, data });
export const fail = (code: string, message: string, status = 400) => json({ ok: false, error: { code, message } }, status);

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Service-role client: bypasses RLS. Only for server-side work the user is allowed to trigger. */
export const admin = (): SupabaseClient => createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Returns the signed-in user from the request's JWT, or null. */
export async function requireUser(req: Request): Promise<User | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}
