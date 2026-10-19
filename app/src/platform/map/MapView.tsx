import { forwardRef, useImperativeHandle, useRef, type ReactElement, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Camera, Map, Marker as MLMarker, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';

/**
 * Android map (spec §26.7, M11): MapLibre Native with OpenFreeMap's free "positron" style (no key, no account, no
 * limits), with the same props as the web map (MapView.web.tsx) so the Map screen is shared. Place data credits sit in
 * the map's attribution corner.
 */
export const mapsReady = true;

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
export type MapRef = { animateToRegion: (r: Region, ms?: number) => void };
type LatLng = { latitude: number; longitude: number };

// A tap on a pin also reaches the map underneath; ignore that map tap so it doesn't close the pin's card straight away.
let lastMarkerPress = 0;

const boundsOf = (r: Region): [number, number, number, number] => [
  r.longitude - r.longitudeDelta / 2, r.latitude - r.latitudeDelta / 2,
  r.longitude + r.longitudeDelta / 2, r.latitude + r.latitudeDelta / 2,
];

type Props = {
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  showsUserLocation?: boolean;
  onRegionChangeComplete?: (r: Region) => void;
  onPress?: () => void;
  /** Space covered by panels over the map (top bar, list sheet). */
  mapPadding?: { top?: number; bottom?: number; left?: number; right?: number };
  children?: ReactNode;
};

export const GoogleMap = forwardRef<MapRef, Props>(function GoogleMap({ style, initialRegion, showsUserLocation, onRegionChangeComplete, onPress, mapPadding, children }, ref) {
  const camera = useRef<CameraRef>(null);
  useImperativeHandle(ref, () => ({
    animateToRegion: (r, ms = 400) => camera.current?.fitBounds(boundsOf(r), { duration: ms }),
  }), []);
  return (
    <Map
      style={style}
      mapStyle={STYLE}
      contentInset={mapPadding}
      logo={false}
      compass={false}
      touchRotate={false}
      touchPitch={false}
      // A normal view instead of a separate surface, so sheets and panels draw above the map.
      androidView="texture"
      attribution
      attributionPosition={{ bottom: (mapPadding?.bottom ?? 0) + 8, left: 8 }}
      onPress={() => { if (Date.now() - lastMarkerPress > 400) onPress?.(); }}
      onRegionDidChange={(e) => {
        const [w, s, east, n] = e.nativeEvent.bounds;
        onRegionChangeComplete?.({ latitude: (s + n) / 2, longitude: (w + east) / 2, latitudeDelta: n - s, longitudeDelta: east - w });
      }}
    >
      <Camera ref={camera} initialViewState={{ bounds: boundsOf(initialRegion) }} />
      {showsUserLocation ? <UserLocation /> : null}
      {children}
    </Map>
  );
});

/** A pin with React content (our MapPin / Cluster), placed by MapLibre at a coordinate. */
export function Marker({ coordinate, anchor, onPress, children }: { coordinate: LatLng; anchor?: { x: number; y: number }; onPress?: () => void; children?: ReactNode; tracksViewChanges?: boolean }) {
  return (
    <MLMarker lngLat={[coordinate.longitude, coordinate.latitude]} anchor={anchor && anchor.y >= 0.9 ? 'bottom' : 'center'} onPress={() => { lastMarkerPress = Date.now(); onPress?.(); }}>
      {children as ReactElement}
    </MLMarker>
  );
}
