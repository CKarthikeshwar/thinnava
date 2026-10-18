import type { FeedItem } from '@/features/visits/api';
import type { SavedInput } from './api';
import type { SavedDraft } from './SavedFields';

/** Form draft → save_saved_entry payload. New friend names travel with the entry (created server-side, offline-safe). */
export function toInput(id: string, d: SavedDraft): SavedInput {
  const friend = d.kind === 'friend' ? d.friend : null;
  return {
    id,
    kind: d.kind,
    place_id: d.place!.placeId,
    friend_name_id: friend && !friend.isNew ? friend.id : null,
    new_friend_name: friend?.isNew ? { id: friend.id, name: friend.name } : null,
    source_url: d.kind === 'internet' && d.link ? d.link : null,
    rating: d.rating,
    loved: d.loved,
    disliked: d.disliked,
    price_per_person: d.price ? Number(d.price) : null,
    visited_on: d.kind === 'friend' ? d.visitedOn : null,
  };
}

/** The Home card for a saved entry that is waiting offline (spec §13), so it shows before it syncs. */
export function toFeedItem(id: string, d: SavedDraft): FeedItem {
  const i = toInput(id, d);
  return {
    entry_type: d.kind, id, created_at: new Date().toISOString(), author_id: null, author_name: null, author_avatar: null, is_mine: true,
    place_id: i.place_id, place_name: d.place!.name, place_area: d.place!.area, place_category: d.place!.category,
    rating: i.rating ?? null, loved: i.loved ?? [], disliked: i.disliked ?? [], price_per_person: i.price_per_person ?? null,
    visited_on: i.visited_on ?? null, companions: [], is_private: true,
    friend_name: d.kind === 'friend' ? d.friend?.name ?? null : null, source_url: i.source_url ?? null, friend_user_id: null,
  };
}
