import { createMMKV } from 'react-native-mmkv';

/** Fast on-device key-value store (spec §18.1): session, small settings, later the query cache and outbox. */
export const storage = createMMKV({ id: 'thinnava' });

/** Adapter so supabase-js keeps its session in MMKV. */
export const authStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => {
    storage.remove(key);
  },
};
