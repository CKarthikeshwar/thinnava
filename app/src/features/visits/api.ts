import { supabase } from '@/lib/supabase';
import type { Category } from '@/features/places/api';
import type { Rating } from '@/components';

export type FeedItem = {
  entry_type: 'visit' | 'friend' | 'internet';
  id: string;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  is_mine: boolean;
  place_id: string;
  place_name: string;
  place_area: string | null;
  place_category: Category | null;
  rating: Rating | null;
  loved: string[];
  disliked: string[];
  price_per_person: number | null;
  visited_on: string | null;
  companions: string[];
  is_private: boolean;
  /** Friend entries: the private friend name. Internet entries: the link, if any. */
  friend_name: string | null;
  source_url: string | null;
  /** The account a friend name is linked to (owner-only), so the card can open their profile. */
  friend_user_id: string | null;
};

export type FeedFilter = 'all' | 'connections' | 'friends' | 'internet' | 'mine';

export type VisitInput = {
  id: string;
  place_id: string;
  visited_on: string;
  rating: Rating;
  loved: string[];
  disliked: string[];
  price_per_person: number | null;
  notes: string | null;
  audience: string[];
  companion_name_ids: string[];
  new_companion_names: string[];
  /** Connections tagged on this visit (§7); omit to leave tags unchanged. */
  tag_user_ids?: string[];
  /** Accepting a tag with this visit (E8 "Write my review"). */
  accept_tag_id?: string;
};

export type EntryDetail = {
  type: 'visit';
  id: string;
  is_mine: boolean;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  place_id: string;
  place_name: string;
  place_area: string | null;
  place_category: Category | null;
  visited_on: string;
  rating: Rating;
  loved: string[];
  disliked: string[];
  price_per_person: number | null;
  notes: string | null;
  created_at: string;
  companions: string[];
  companion_ids: string[] | null;
  audience_ids: string[] | null;
  /** Tag people on this visit (ids for tapping names; the author's own tags pre-fill D3). */
  tags: { tag_id: string; user_id: string; name: string; avatar_url: string | null; status: 'pending' | 'accepted'; direction: 'tagged' | 'tagger' }[];
  /** My own tag on this visit, if I'm the tagged person (for "Remove me from this visit"). */
  my_tag: { id: string; status: 'pending' | 'accepted' } | null;
  audience: string[] | null;
};

export type PlacePageData = {
  on_wishlist: boolean;
  my_visits: { id: string; visited_on: string; rating: Rating }[];
  /** Connections' visible visits and my own friend / internet entries, newest first (spec §22.5). */
  people_visits: {
    entry_type: 'visit' | 'friend' | 'internet';
    id: string; author_id?: string; author_name?: string; author_avatar?: string | null;
    friend_name?: string | null; friend_user_id?: string | null; source_url?: string | null; rating: Rating | null;
    loved: string[]; disliked: string[]; price_per_person: number | null; visited_on: string | null; companions: string[];
  }[];
};

export type AudienceList = { id: string; kind: 'all' | 'only_me' | 'custom'; name: string; members: number };
export type CompanionName = { id: string; name: string };

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export const PAGE = 20;

export const homeFeed = (filter: FeedFilter, before?: { created_at: string; id: string }) =>
  rpc<FeedItem[]>('home_feed', { p_filter: filter, p_before: before?.created_at ?? null, p_before_id: before?.id ?? null, p_limit: PAGE });

export const saveVisit = (v: VisitInput) => rpc<{ id: string; removed_from_wishlist: boolean }>('save_visit', { p: v });
export const deleteVisit = (id: string) => rpc<void>('delete_visit', { p_id: id });
export const entryDetail = (type: string, id: string) => rpc<EntryDetail | null>('entry_detail', { p_type: type, p_id: id });
export const placePage = (placeId: string) => rpc<PlacePageData>('place_page', { p_place_id: placeId });
export const setWishlist = (placeId: string, on: boolean) => rpc<void>('set_wishlist', { p_place_id: placeId, p_on: on });
export const setWishlistAudience = (ids: string[]) => rpc<void>('set_wishlist_audience', { p_list_ids: ids });
export const myWishlistAudience = () => rpc<string[]>('my_wishlist_audience');
export const myWishlist = () => rpc<{ place_id: string; name: string; area: string | null; category: Category | null; created_at: string }[]>('my_wishlist');
export const myCounts = () => rpc<{ visits: number; wishlist: number; connections: number; saved: number }>('my_counts');
export const myLists = () => rpc<AudienceList[]>('my_lists');

export async function myCompanionNames(): Promise<CompanionName[]> {
  const { data, error } = await supabase.from('companion_names').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
}

/** Query keys that change when a visit or the wishlist changes. */
export const ENTRY_KEYS = [['feed'], ['place'], ['placePage'], ['entry'], ['myCounts'], ['myWishlist'], ['companionNames']];
