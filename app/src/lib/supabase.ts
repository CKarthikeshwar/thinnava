import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  // Shown in the dev console; the app can't talk to the backend without these (app/.env, spec §27.3).
  console.warn('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY in app/.env');
}

/** The one backend client. Screens never use it directly; each feature's api.ts does (spec §26.1). */
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Refresh tokens only while the app is in the foreground (Supabase's React Native guidance).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const backendConfigured = Boolean(url && key);
