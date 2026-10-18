import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { storage } from './storage';

/**
 * Offline drafts and pending shares (spec §13, §26.5). Both stay on this device only; nothing here is ever synced or
 * shown to anyone until the user finishes it.
 * - Drafts: an entry saved offline with "Use '<name>' for now" instead of a real place. F6 → pick the place → it
 *   becomes a normal outbox op.
 * - Pending shares: text shared or copied while offline, read by AI on the next online open ("1 message waiting").
 */

/** A stand-in place made offline. Its id starts with "draft:" and is replaced before anything syncs. */
export const DRAFT_PREFIX = 'draft:';
export const isDraftPlace = (placeId: string | null | undefined) => !!placeId?.startsWith(DRAFT_PREFIX);
const placeNames = new Map<string, string>();
/** A new stand-in place for what the user typed offline. */
export function newDraftPlace(name: string) {
  const id = `${DRAFT_PREFIX}${randomUUID()}`;
  placeNames.set(id, name);
  return { placeId: id, name, area: null, address: null, lat: 0, lng: 0, category: null, businessStatus: null };
}
export const draftPlaceName = (id: string) => placeNames.get(id) ?? useDrafts.getState().drafts.find((d) => (d.args.p as { place_id?: string })?.place_id === id)?.placeName ?? 'a place';

export type Draft = {
  id: string; // the entry id (made on the device)
  kind: 'save_visit' | 'save_saved_entry';
  args: Record<string, unknown>; // the RPC arguments; p.place_id is the draft id until a place is picked
  placeName: string; // what the user typed
  label: string; // "Visit to Vidyarthi Bhavan"
  createdAt: string;
};
export type PendingShare = { id: string; text: string; createdAt: string };

const read = <T,>(k: string): T[] => { try { return JSON.parse(storage.getString(k) ?? '[]'); } catch { return []; } };
export const useDrafts = create<{ drafts: Draft[]; shares: PendingShare[] }>(() => ({ drafts: read('drafts'), shares: read('pendingShares') }));
const setDrafts = (drafts: Draft[]) => { storage.set('drafts', JSON.stringify(drafts)); useDrafts.setState({ drafts }); };
const setShares = (shares: PendingShare[]) => { storage.set('pendingShares', JSON.stringify(shares)); useDrafts.setState({ shares }); };

/** Keeps a place-less entry on the device (replaces an older draft of the same entry). */
export function saveDraft(d: Omit<Draft, 'createdAt'>) {
  setDrafts([...useDrafts.getState().drafts.filter((x) => x.id !== d.id), { ...d, createdAt: new Date().toISOString() }]);
}
export const removeDraft = (id: string) => setDrafts(useDrafts.getState().drafts.filter((x) => x.id !== id));

export function addPendingShare(text: string) {
  setShares([...useDrafts.getState().shares, { id: randomUUID(), text, createdAt: new Date().toISOString() }]);
}
export const removePendingShare = (id: string) => setShares(useDrafts.getState().shares.filter((x) => x.id !== id));

/** Sign-out (spec §26.3): drafts and pending shares belong to the old account. */
export function clearDrafts() { setDrafts([]); setShares([]); }
