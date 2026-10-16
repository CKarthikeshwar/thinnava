import { useEffect } from 'react';
import { create } from 'zustand';
import type { Place } from './api';

/**
 * D1 returns its choice through this small store (spec §26.2): a form opens `/pick-place?for=select`,
 * the picker drops the place here and goes back, and the form takes it.
 */
export const usePicked = create<{ place: Place | null; put: (p: Place) => void; clear: () => void }>((set) => ({
  place: null,
  put: (place) => set({ place }),
  clear: () => set({ place: null }),
}));

/** Calls onPick once when the picker hands back a place. */
export function useTakePicked(onPick: (p: Place) => void) {
  const place = usePicked((s) => s.place);
  useEffect(() => {
    if (!place) return;
    onPick(place);
    usePicked.getState().clear();
  }, [place]);
}
