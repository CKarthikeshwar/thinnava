import { supabase } from '@/lib/supabase';
import type { Category } from '@/features/places/api';
import type { Rating } from '@/components';
import type { Relation } from '@/features/people/api';

export type NotifType = 'connect_request' | 'connect_accepted' | 'tag_request' | 'connection_visited' | 'wishlist_visited';
export type Notif = {
  id: string; type: NotifType; created_at: string; read: boolean;
  actor_id: string | null; actor_name: string | null; actor_avatar: string | null; actor_relation: Relation | null;
  visit_id: string | null; place_id: string | null; place_name: string | null;
  tag_id: string | null; tag_status: 'pending' | 'accepted' | null;
};
export type TagDetail = {
  id: string; status: 'pending' | 'accepted'; tagged_visit_id: string | null;
  tagger_id: string; tagger_name: string; tagger_avatar: string | null;
  visit_id: string; place_id: string; place_name: string; place_area: string | null; place_category: Category | null;
  visited_on: string; rating: Rating; loved: string[]; disliked: string[]; price_per_person: number | null; notes: string | null;
};

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export const notificationsPage = (before?: { created_at: string; id: string }) =>
  rpc<Notif[]>('notifications_page', { p_before: before?.created_at ?? null, p_before_id: before?.id ?? null, p_limit: 30 });
export const markNotificationsRead = () => rpc<void>('mark_notifications_read');
export const unreadNotifications = () => rpc<number>('unread_notifications');
export const tagDetail = (id: string) => rpc<TagDetail | null>('tag_detail', { p_tag_id: id });
export const respondTag = (id: string, action: 'same' | 'reject') => rpc<string | null>('respond_tag', { p_tag_id: id, p_action: action });
export const untagMe = (id: string) => rpc<void>('untag_me', { p_tag_id: id });
export const registerPushToken = (token: string) => rpc<void>('register_push_token', { p_token: token });
export const unregisterPushToken = (token: string) => rpc<void>('unregister_push_token', { p_token: token });

export const NOTIF_KEYS = [['notifications'], ['unread'], ['feed'], ['entry'], ['placePage'], ['myCounts'], ['userVisits'], ['tag']];
