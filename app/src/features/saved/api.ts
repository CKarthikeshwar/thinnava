import { supabase } from '@/lib/supabase';
import { runWrite } from '@/lib/outbox';
import { callFunction, FnError } from '@/lib/functions';
import type { Category, Place } from '@/features/places/api';
import type { Rating } from '@/components';

export type SavedKind = 'friend' | 'internet';

export type SavedInput = {
  id: string;
  kind: SavedKind;
  place_id: string;
  friend_name_id?: string | null;
  new_friend_name?: { id: string; name: string } | null;
  source_url?: string | null;
  rating: Rating | null;
  loved: string[];
  disliked: string[];
  price_per_person: number | null;
  visited_on: string | null;
};

export type FriendName = { id: string; name: string; entries: number; last_used: string; linked_username: string | null };

export type SavedDetail = {
  type: SavedKind;
  id: string;
  is_mine: true;
  friend_name: string | null;
  friend_name_id: string | null;
  source_url: string | null;
  place_id: string;
  place_name: string;
  place_area: string | null;
  place_category: Category | null;
  visited_on: string | null;
  rating: Rating | null;
  loved: string[];
  disliked: string[];
  price_per_person: number | null;
  created_at: string;
};

export type SavedRow = {
  id: string; kind: SavedKind; created_at: string; place_id: string; place_name: string; place_area: string | null;
  place_category: Category | null; rating: Rating | null; friend_name: string | null; source_url: string | null;
};

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export const SAVED_PAGE = 20;

// Offline-capable (spec §13): `queued` means it waits in the outbox.
export const saveSaved = (p: SavedInput, label: string) => runWrite<{ id: string; friend_name_id: string | null }>('save_saved_entry', { p }, label);
export const deleteSaved = (id: string, label = 'Delete an entry') => runWrite<void>('delete_saved_entry', { p_id: id }, label);
export const savedDetail = (id: string) => rpc<SavedDetail | null>('entry_detail', { p_type: 'saved', p_id: id });
export const mySaved = (kind: SavedKind | null, before?: { created_at: string; id: string }) =>
  rpc<SavedRow[]>('my_saved', { p_kind: kind, p_before: before?.created_at ?? null, p_before_id: before?.id ?? null, p_limit: SAVED_PAGE });

export const myFriendNames = () => rpc<FriendName[]>('my_friend_names');
export const addFriendName = (id: string, name: string) => runWrite<string>('add_friend_name', { p_id: id, p_name: name }, `Add the name ${name}`);
export const renameFriendName = (id: string, name: string) => runWrite<void>('rename_friend_name', { p_id: id, p_name: name }, `Rename to ${name}`);
export const mergeFriendNames = (from: string, into: string) => rpc<void>('merge_friend_names', { p_from: from, p_into: into });
export const deleteFriendName = (id: string) => rpc<void>('delete_friend_name', { p_id: id });

/** Query keys that change when a saved entry or a friend name changes. */
export const SAVED_KEYS = [['feed'], ['placePage'], ['entry'], ['myCounts'], ['mySaved'], ['friendNames']];

// ---- AI import (extract / links Edge Functions, spec §23–§24) ----
export type Confidence = { place: number; review: number; pricePerPerson: number; visitDate: number };
export type ExtractedItem = {
  place: { name: string; area: string | null; city: string | null };
  review: Rating | null;
  lovedDishes: string[];
  dislikedDishes: string[];
  pricePerPerson: number | null;
  visitDate: string | null;
  confidence: Confidence;
  candidates: Place[];
};
export type Extraction = { foodRelated: boolean; items: ExtractedItem[]; practice?: boolean };
export type LinkKind = 'maps' | 'instagram' | 'youtube' | 'other';
export type LinkResult = { kind: LinkKind; resolvedUrl: string; suggestion?: Place | null; meta?: { title: string | null; description: string | null; hint: string | null } | null };

/** D7 gives up after 15 s whatever the server does (spec §10.2); the form opens instead. */
const within = <T>(ms: number, p: Promise<T>) =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new FnError('timeout', 'Reading took too long.')), ms))]);

export const extractText = (text: string, near?: { lat: number; lng: number } | null) =>
  within(15_000, callFunction<Extraction>('extract', { text: text.slice(0, 4000), ...(near ?? {}) }));
export const resolveLink = (url: string, text?: string) => within(8_000, callFunction<LinkResult>('links', { url, text }));

/** Confidence below this gets the amber "Please check this" flag (spec §10.3). */
export const LOW_CONFIDENCE = 0.6;

/** First http(s) URL in a piece of text, if any. */
export function findUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[).,!?]+$/, '') ?? null;
}

/**
 * Reddit blocks the server from reading posts, but a post link carries its title: reddit.com/r/<sub>/comments/<id>/<title_words>/
 * (spec §10.1). Returns "title words (r/sub)", or null for other links and Reddit share links that weren't expanded.
 */
export function redditHint(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (!/(^|\.)reddit\.com$/i.test(u.hostname)) return null;
  const m = u.pathname.match(/^\/r\/([^/]+)\/comments\/[^/]+\/([^/]+)/i);
  if (!m) return null;
  let words = m[2];
  try { words = decodeURIComponent(words); } catch {}
  words = words.replace(/_/g, ' ').trim();
  return words ? `${words} (r/${m[1]})` : null;
}
