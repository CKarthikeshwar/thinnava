import { supabase } from '@/lib/supabase';
import { googleSignIn, googleSignOut } from '@/platform/signin/google';
import { forgetPushToken } from '@/features/notifications/push';
import { queryClient, queryPersister } from '@/lib/queryClient';
import { clearOutbox } from '@/lib/outbox';
import { clearDrafts } from '@/lib/drafts';

export type MyProfile = { id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null };

/** Google → ID token → Supabase session (spec §26.3). Returns false if the user cancelled. */
export async function signInWithGoogle(): Promise<boolean> {
  const g = await googleSignIn();
  if (g.kind === 'cancelled') return false;
  if (g.kind === 'error') throw new Error(g.message);
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: g.idToken });
  if (error) throw error;
  return true;
}

export async function signOut() {
  await forgetPushToken();
  await googleSignOut();
  await supabase.auth.signOut();
  // Nothing of the old account stays on the phone (spec §26.3): cached data, queued changes, drafts, waiting messages.
  queryClient.clear();
  queryPersister.removeClient();
  clearOutbox();
  clearDrafts();
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data, error } = await supabase.rpc('my_profile');
  if (error) throw error;
  return (data?.[0] as MyProfile | undefined) ?? null;
}

export async function usernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { p_username: username });
  if (error) throw error;
  return Boolean(data);
}

export async function createProfile(username: string, displayName: string) {
  const { error } = await supabase.rpc('create_profile', { p_username: username, p_display_name: displayName });
  if (error) throw error;
}

export async function updateProfile(username: string, displayName: string, bio: string | null) {
  const { error } = await supabase.rpc('update_profile', { p_username: username, p_display_name: displayName, p_bio: bio });
  if (error) throw error;
}

/** Permanently deletes the account (F7) through the delete-account Edge Function, then signs out. */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await googleSignOut();
  await supabase.auth.signOut({ scope: 'local' });
}
