import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Web layout (spec §18.3, design/web.html). The Android app is always 'app'. In a browser, 'laptop' from 1024 px wide
 * (top bar with links, wide pages), otherwise 'phone' (top bar with tabs, the app's screens).
 */
export type LayoutMode = 'app' | 'phone' | 'laptop';
export const IS_WEB = Platform.OS === 'web';
export const WIDE_FROM = 1024;
/** Max width of the four main pages on a laptop. */
export const PAGE_MAX = 1160;
/** Max width of every other screen (place, entry, forms, settings…) on a laptop. */
export const COLUMN_MAX = 720;
export const SHEET_MAX = 560;

export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  if (!IS_WEB) return 'app';
  return width >= WIDE_FROM ? 'laptop' : 'phone';
}

/** True on a laptop-width browser. */
export function useWide() {
  return useLayoutMode() === 'laptop';
}

/** Web: calls onEscape when Esc is pressed while `active` (sheets, dialogs, menus). No-op on Android. */
export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!IS_WEB || !active) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, onEscape]);
}
