// delete-account (spec §23, F7): permanently deletes the caller's account.
// Deleting the auth user cascades through profiles to everything they own.
import { admin, fail, ok, requireUser } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);
  const user = await requireUser(req);
  if (!user) return fail('not_signed_in', 'Sign in first', 401);

  const { error } = await admin().auth.admin.deleteUser(user.id);
  if (error) return fail('delete_failed', 'Could not delete the account. Try again.', 500);
  return ok();
});
