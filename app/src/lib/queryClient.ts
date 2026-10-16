import { QueryClient } from '@tanstack/react-query';

/** Server-state cache (spec §26.4). Persistence to MMKV for offline reads arrives in M9. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});
