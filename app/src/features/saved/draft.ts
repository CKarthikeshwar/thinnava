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
