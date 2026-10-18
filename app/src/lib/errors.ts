import { isOnline } from './net';

// Backend rule violations arrive as message keys (spec §22). Map them to plain language (spec §15).
const messages: Record<string, string> = {
  username_taken: 'That username is taken. Try another.',
  username_invalid: 'Letters, numbers, . and _ only. 3–20 characters.',
  name_invalid: 'Add your name (up to 40 characters).',
  bio_too_long: 'Keep your bio under 150 characters.',
  profile_exists: 'You already have a profile.',
  not_signed_in: 'Please sign in again.',
  network: "Couldn't reach Thinnava. Check your internet and try again.",
  offline: "You're offline. Try again when you're connected.",
};

export function friendlyError(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  const raw = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
  for (const key of Object.keys(messages)) if (raw.includes(key)) return messages[key];
  // Social actions, search and settings don't queue offline (spec §13): say so plainly.
  if (/network|fetch/i.test(raw)) return isOnline() ? messages.network : messages.offline;
  return fallback;
}
