import { useState } from 'react';
import { storage } from '@/lib/storage';

/**
 * Web copy flow (spec §18.3). Browsers can't check the clipboard without asking, so instead of noticing a copy,
 * Home and D5 always offer "Paste a message". Tapping it reads the clipboard (the browser asks permission, or iPhone
 * shows a Paste bubble). ✕ on Home hides the card for 6 hours, as on Android.
 */
const KEY = 'clipHandledAt';
const QUIET_MS = 6 * 60 * 60 * 1000;
const recentlyHandled = () => {
  try { return Date.now() - (storage.getNumber(KEY) ?? 0) < QUIET_MS; } catch { return false; }
};

export function markClipboardHandled() {
  try { storage.set(KEY, Date.now()); } catch { /* best effort */ }
}

/** Reads what the user copied. Throws if the browser refuses (the caller says what to do). */
export async function readClipboard(): Promise<string> {
  if (!navigator.clipboard?.readText) throw new Error('clipboard_unavailable');
  return (await navigator.clipboard.readText()).trim();
}

export function useCopiedText(respectQuiet: boolean) {
  const [has, setHas] = useState(() => !(respectQuiet && recentlyHandled()));
  return { has, hide: () => setHas(false) };
}

export const PASTE_TEXT = {
  cardTitle: 'Saving what a friend told you?', cardSub: 'Copy their message, then paste it here', cardAction: 'Paste a message',
  chipTitle: 'Paste a message?', chipSub: "We'll read it and fill this in for you", chipAction: 'Paste',
  empty: "Nothing to paste. Copy the message first, or allow pasting when your browser asks.",
};
