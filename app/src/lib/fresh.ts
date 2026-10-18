import { create } from 'zustand';

/**
 * The entry just saved (DESIGN.md "Share import": the new card lands on Home tinted Pale Cobalt, then fades to white).
 * Set right after a save; the matching Home card plays the fade once and clears it.
 */
export const useFresh = create<{ id: string | null }>(() => ({ id: null }));
export const markFresh = (id: string) => useFresh.setState({ id });
export const clearFresh = () => useFresh.setState({ id: null });
