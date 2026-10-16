import { useEffect } from 'react';
import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { storage } from '@/lib/storage';

/**
 * Share → Thinnava (spec §10.0, §26.6). Text or a link shared from another app opens /import.
 * Signed out (or still setting up): the share is kept on the device and continues after sign-in.
 * Offline handling (drafts "Waiting for internet") arrives with the outbox in M9; until then /import says "You're offline".
 */
const PENDING = 'pendingShare';

export function useShareImport(ready: boolean) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;
    const text = (shareIntent.text ?? '').trim();
    const url = shareIntent.webUrl ?? null;
    if (text || url) {
      try { storage.set(PENDING, JSON.stringify({ text: text || url, url })); } catch { /* best effort */ }
    }
    resetShareIntent();
  }, [hasShareIntent]);

  useEffect(() => {
    if (!ready) return;
    let raw: string | undefined;
    try { raw = storage.getString(PENDING); } catch { raw = undefined; }
    if (!raw) return;
    try { storage.remove(PENDING); } catch { /* ignore */ }
    const { text, url } = JSON.parse(raw) as { text: string; url: string | null };
    router.push({ pathname: '/import', params: { text, ...(url ? { url } : {}), from: 'share' } });
  }, [ready, hasShareIntent]);
}
