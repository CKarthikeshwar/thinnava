import { supabase } from '@/lib/supabase';

// Web sign-in (spec §18.3): Google through a Supabase OAuth redirect. The page leaves for Google and comes back
// signed in (the client picks the session up from the URL), so this never resolves with a token.
export type GoogleResult = { kind: 'ok'; idToken: string } | { kind: 'cancelled' } | { kind: 'error'; message: string };

export async function googleSignIn(): Promise<GoogleResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
  });
  return error ? { kind: 'error', message: error.message } : { kind: 'cancelled' };
}

export async function googleSignOut() {
  // Nothing to do: there's no Google session in the page itself.
}
