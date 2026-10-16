import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase, backendConfigured } from '@/lib/supabase';
import { fetchMyProfile, type MyProfile } from './api';

/**
 * Where the user is in the auth flow (spec §26.3):
 * loading → signedOut (intro/welcome) → needsProfile (setup) → ready (tabs).
 */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

type State = {
  status: AuthStatus;
  session: Session | null;
  profile: MyProfile | null;
  setProfile: (p: MyProfile | null) => void;
  refresh: () => Promise<void>;
};

export const useAuth = create<State>((set, get) => ({
  status: 'loading',
  session: null,
  profile: null,
  setProfile: (profile) => set({ profile, status: profile ? 'ready' : get().session ? 'needsProfile' : 'signedOut' }),
  refresh: async () => {
    const session = get().session;
    if (!session) return set({ status: 'signedOut', profile: null });
    try {
      const profile = await fetchMyProfile();
      set({ profile, status: profile ? 'ready' : 'needsProfile' });
    } catch {
      // Offline or backend hiccup: keep a signed-in user inside the app if we already knew their profile.
      set({ status: get().profile ? 'ready' : 'needsProfile' });
    }
  },
}));

/** Mounted once in the root layout: follows Supabase's session and loads the profile. */
export function useAuthBootstrap() {
  useEffect(() => {
    if (!backendConfigured) {
      useAuth.setState({ status: 'signedOut' });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      useAuth.setState({ session: data.session });
      useAuth.getState().refresh();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      useAuth.setState({ session });
      if (event === 'SIGNED_OUT') useAuth.setState({ status: 'signedOut', profile: null });
      if (event === 'SIGNED_IN') useAuth.getState().refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}
