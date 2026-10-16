import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { storage } from '@/lib/storage';

/**
 * Copied text (spec §10.0, §26.6). The app only asks Android *whether* the clipboard has text (no "pasted" notice);
 * it reads the text only when the user taps Read it or Use. After Read it or ✕ the Home card stays hidden for 6 hours,
 * unless the clipboard changes while the app is open.
 */
const KEY = 'clipHandledAt';
const QUIET_MS = 6 * 60 * 60 * 1000;

const recentlyHandled = () => {
  try { return Date.now() - (storage.getNumber(KEY) ?? 0) < QUIET_MS; } catch { return false; }
};

export function markClipboardHandled() {
  try { storage.set(KEY, Date.now()); } catch { /* best effort */ }
}

/** Reads the copied text (this is what shows Android's "pasted from clipboard" notice). */
export async function readClipboard(): Promise<string> {
  return (await Clipboard.getStringAsync()).trim();
}

/** Whether there's copied text worth offering. `respectQuiet` (Home card) honours the 6-hour pause; the D5 chip doesn't. */
export function useCopiedText(respectQuiet: boolean) {
  const [has, setHas] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const yes = await Clipboard.hasStringAsync().catch(() => false);
      if (alive) setHas(yes && !(respectQuiet && recentlyHandled()));
    };
    check();
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    // A new copy while the app is open brings the card back even inside the quiet window.
    const clip = Clipboard.addClipboardListener(() => {
      try { storage.remove(KEY); } catch { /* ignore */ }
      check();
    });
    return () => { alive = false; app.remove(); Clipboard.removeClipboardListener(clip); };
  }, [respectQuiet]);
  return { has, hide: () => setHas(false) };
}
