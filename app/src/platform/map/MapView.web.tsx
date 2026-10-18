import type { ComponentProps, ReactNode, Ref } from 'react';
import { View } from 'react-native';

/**
 * Web map (spec §18.3). Until `thinnava-maps` has a key, the web shows B2's list mode, so these are never rendered.
 * With a key, this becomes `@vis.gl/react-google-maps` (Maps JavaScript API), with the same props as Android's.
 */
export const mapsReady = false;

export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
export type MapRef = { animateToRegion: (r: Region, ms?: number) => void };

export function GoogleMap(_props: ComponentProps<typeof View> & { ref?: Ref<MapRef>; [k: string]: unknown }) {
  return null;
}
export function Marker(_props: { children?: ReactNode; [k: string]: unknown }) {
  return null;
}
