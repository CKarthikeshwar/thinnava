import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { storage } from './storage';

/** Server-state cache (spec §26.4). */
export const queryClient = new QueryClient({
  defaultOptions: {
    // Cached data stays a week so screens open instantly and work offline (§13 "reading anything already loaded").
    queries: { staleTime: 30_000, gcTime: 7 * 24 * 3600_000, retry: 1, refetchOnWindowFocus: false },
  },
});

/** The cache is persisted to MMKV (max age 7 days) and restored on start. */
export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (k) => storage.getString(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => { storage.remove(k); },
  },
  key: 'queryCache',
  throttleTime: 1000,
});
export const PERSIST_MAX_AGE = 7 * 24 * 3600_000;
