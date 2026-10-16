import { supabase } from '@/lib/supabase';
import type { Category } from '@/features/places/api';
import type { Rating } from '@/components';

/** My relation to someone (spec §22.1). `requested` = I asked (also after a silent decline); `incoming` = they asked me. */
export type Relation = 'self' | 'none' | 'requested' | 'incoming' | 'connected' | 'blocked_by_me';

export type Person = { id: string; username: string; display_name: string; avatar_url: string | null };
export type PersonResult = Person & { relation: Relation };
export type ProfilePage = Person & {
  relation: Relation;
  bio?: string | null;
  visits?: number;
  wishlist_visible?: boolean;
  notify?: boolean;
  my_lists?: { id: string; name: string }[];
};
export type Request = Person & { direction: 'incoming' | 'outgoing'; created_at: string };
export type UserVisit = { id: string; created_at: string; place_id: string; place_name: string; place_area: string | null; place_category: Category | null; rating: Rating; visited_on: string };
export type UserWish = { place_id: string; name: string; area: string | null; category: Category | null; created_at: string; on_mine: boolean;
  /** I've been there myself, so no ♡ (§9). */
  i_went: boolean };
export type ListDetail = { id: string; name: string; kind: 'all' | 'only_me' | 'custom'; members: Person[]; visits: number };

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export const searchPeople = (q: string) => rpc<PersonResult[]>('search_people', { p_query: q });
export const profilePage = (id: string) => rpc<ProfilePage | null>('profile_page', { p_user: id });
export const userVisits = (id: string, before?: { created_at: string; id: string }) =>
  rpc<UserVisit[]>('user_visits', { p_user: id, p_before: before?.created_at ?? null, p_before_id: before?.id ?? null, p_limit: 20 });
export const userWishlist = (id: string) => rpc<UserWish[]>('user_wishlist', { p_user: id });

export const sendRequest = (to: string) => rpc<'requested' | 'connected'>('send_request', { p_to: to });
export const cancelRequest = (to: string) => rpc<void>('cancel_request', { p_to: to });
export const respondRequest = (from: string, accept: boolean) => rpc<void>('respond_request', { p_from: from, p_accept: accept });
export const removeConnection = (other: string) => rpc<void>('remove_connection', { p_other: other });
export const blockUser = (other: string) => rpc<void>('block_user', { p_other: other });
export const unblockUser = (other: string) => rpc<void>('unblock_user', { p_other: other });
export const setActivityNotifications = (target: string, on: boolean) => rpc<void>('set_activity_notifications', { p_target: target, p_on: on });

export const myConnections = () => rpc<(Person & { since: string })[]>('my_connections');
export const myRequests = () => rpc<Request[]>('my_requests');
export const myBlocked = () => rpc<Person[]>('my_blocked');
export const pendingListPrompts = () => rpc<Person[]>('pending_list_prompts');
export const dismissListPrompt = (other: string) => rpc<void>('dismiss_list_prompt', { p_other: other });

export const createList = (name: string) => rpc<string>('create_list', { p_name: name });
export const renameList = (id: string, name: string) => rpc<void>('rename_list', { p_id: id, p_name: name });
export const deleteList = (id: string) => rpc<void>('delete_list', { p_id: id });
export const setListMembers = (id: string, members: string[]) => rpc<void>('set_list_members', { p_id: id, p_members: members });
export const addToLists = (member: string, lists: string[]) => rpc<void>('add_to_lists', { p_member: member, p_list_ids: lists });
export const listDetail = (id: string) => rpc<ListDetail | null>('list_detail', { p_id: id });
export type WhoWent = { place_id: string; people: { id: string; name: string; avatar: string | null }[]; count: number; i_went: boolean; prices: number[] };
export const whoWent = (placeIds: string[]) => rpc<WhoWent[]>('who_went', { p_place_ids: placeIds });

/** B2a price buckets (spec §14): a place matches if any entry I can see there has a price in the bucket. */
export const PRICE_BUCKETS = [
  { key: 'u200', label: 'Under ₹200', min: 1, max: 199 },
  { key: '200', label: '₹200–500', min: 200, max: 500 },
  { key: '500', label: '₹500–1000', min: 501, max: 1000 },
  { key: '1000', label: '₹1000+', min: 1001, max: 50000 },
] as const;
export type PriceKey = (typeof PRICE_BUCKETS)[number]['key'];

export const linkFriendName = (id: string, user: string | null) => rpc<void>('link_friend_name', { p_id: id, p_user: user });

/** Everything that can change when a relationship changes. */
export const PEOPLE_KEYS = [['people'], ['profilePage'], ['connections'], ['requests'], ['blocked'], ['myLists'], ['listDetail'], ['listPrompts'], ['feed'], ['placePage'], ['myCounts'], ['userVisits'], ['userWishlist'], ['friendNames']];
