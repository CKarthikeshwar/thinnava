import { useEffect } from 'react';
import { create } from 'zustand';
import type { Place } from './api';

/**
 * D1 returns its choice through this small store (spec §26.2): a form opens `/pick-place?for=select`,
 * the picker drops the place here and goes back, and the form takes it. `for` keeps the Map tab (always mounted)
 * from taking a place picked for a form, and the other way round.
 */
export type PickFor = 'select' | 'map' | 'draft';
export const usePicked = create<{ place: Place | null; for: PickFor; put: (p: Place, f?: PickFor) => void; clear: () => void }>((set) => ({
  place: null,
  for: 'select',
  put: (place, f = 'select') => set({ place, for: f }),
  clear: () => set({ place: null }),
}));

/** Calls onPick once when the picker hands back a place. */
export function useTakePicked(onPick: (p: Place) => void, purpose: PickFor = 'select') {
  const place = usePicked((s) => s.place);
  const f = usePicked((s) => s.for);
  useEffect(() => {
    if (!place || f !== purpose) return;
    onPick(place);
    usePicked.getState().clear();
  }, [place, f]);
}
