// Shared helpers for Edge Functions (spec §23): JSON responses in the { ok, data } / { ok, error } shape, and auth.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

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
