import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getNear } from '@/lib/location';
import { colors } from '@/theme';

/**
 * Web map (spec §18.3, §26.7): MapLibre with OpenFreeMap's free "positron" style (no key, no account, no limits),
 * with the same props as the Android map so the Map screen doesn't change. The map library loads only when the Map
 * page opens. Place data credits (Ola Maps, OpenStreetMap) sit in the map's attribution corner.
 */
export const mapsReady = true;

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const WORKER = '/maplibre/worker-6.13.0.mjs';
export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
export type MapRef = { animateToRegion: (r: Region, ms?: number) => void };
type LatLng = { latitude: number; longitude: number };

const MapCtx = createContext<{ map: MLMap | null; lib: typeof import('maplibre-gl') | null }>({ map: null, lib: null });

const regionOf = (m: MLMap): Region => {
  const b = m.getBounds();
  return {
    latitude: (b.getNorth() + b.getSouth()) / 2, longitude: (b.getEast() + b.getWest()) / 2,
    latitudeDelta: b.getNorth() - b.getSouth(), longitudeDelta: b.getEast() - b.getWest(),
  };
};
const boundsOf = (r: Region): [[number, number], [number, number]] => [
  [r.longitude - r.longitudeDelta / 2, r.latitude - r.latitudeDelta / 2],
  [r.longitude + r.longitudeDelta / 2, r.latitude + r.latitudeDelta / 2],
];

type Props = {
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  showsUserLocation?: boolean;
  onRegionChangeComplete?: (r: Region) => void;
  onPress?: () => void;
  children?: ReactNode;
  /** Space covered by panels over the map; on web only the bottom is used, to keep the credit line above the list panel. */
  mapPadding?: { top?: number; bottom?: number; left?: number; right?: number };
};

export const GoogleMap = forwardRef<MapRef, Props>(function GoogleMap({ style, initialRegion, showsUserLocation, onRegionChangeComplete, onPress, mapPadding, children }, ref) {
  const box = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<{ map: MLMap | null; lib: typeof import('maplibre-gl') | null }>({ map: null, lib: null });
  const onRegion = useRef(onRegionChangeComplete);
  const onTap = useRef(onPress);
  onRegion.current = onRegionChangeComplete;
  onTap.current = onPress;

  useEffect(() => {
    let map: MLMap | null = null;
    let gone = false;
    import('maplibre-gl').then((lib) => {
      if (gone || !box.current) return;
      // The map draws in a background worker, served as a plain file (public/maplibre/); keep its version in step with package.json.
      lib.setWorkerUrl(WORKER);
      map = new lib.Map({
        container: box.current, style: STYLE, bounds: boundsOf(initialRegion), attributionControl: false,
        dragRotate: false, pitchWithRotate: false, touchPitch: false,
      });
      map.addControl(new lib.AttributionControl({ compact: true, customAttribution: 'Places: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Ola Maps</a>' }), 'bottom-left');
      map.touchZoomRotate.disableRotation();
      const lift = mapPadding?.bottom ? mapPadding.bottom + 4 : 0;
      const corner = map.getContainer().querySelector<HTMLElement>('.maplibregl-ctrl-bottom-left');
      if (corner) { corner.style.maxWidth = 'calc(100% - 72px)'; if (lift) corner.style.bottom = `${lift}px`; }
      map.on('moveend', () => onRegion.current?.(regionOf(map!)));
      map.on('click', (e) => { if (!(e.originalEvent.target as HTMLElement).closest('.tn-marker')) onTap.current?.(); });
      map.once('load', () => onRegion.current?.(regionOf(map!)));
      setState({ map, lib });
    });
    return () => { gone = true; map?.remove(); };
  }, []);

  useImperativeHandle(ref, () => ({
    animateToRegion: (r, ms = 400) => state.map?.fitBounds(boundsOf(r), { duration: ms, padding: 20 }),
  }), [state.map]);

  return (
    <View style={style}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
      <MapCtx.Provider value={state}>
        {state.map ? children : null}
        {state.map && showsUserLocation ? <MyLocation /> : null}
      </MapCtx.Provider>
    </View>
  );
});

/** A pin with React content (our MapPin / Cluster), drawn by MapLibre at a coordinate. */
export function Marker({ coordinate, anchor, onPress, children }: { coordinate: LatLng; anchor?: { x: number; y: number }; onPress?: () => void; children?: ReactNode; tracksViewChanges?: boolean }) {
  const { map, lib } = useContext(MapCtx);
  const [el] = useState(() => { const d = document.createElement('div'); d.className = 'tn-marker'; d.style.cursor = 'pointer'; return d; });
  const marker = useRef<MLMarker | null>(null);
  const tap = useRef(onPress);
  tap.current = onPress;

  useEffect(() => {
    if (!map || !lib) return;
    const bottom = anchor && anchor.y >= 0.9;
    marker.current = new lib.Marker({ element: el, anchor: bottom ? 'bottom' : 'center' }).setLngLat([coordinate.longitude, coordinate.latitude]).addTo(map);
    const h = (e: MouseEvent) => { e.stopPropagation(); tap.current?.(); };
    el.addEventListener('click', h);
    return () => { el.removeEventListener('click', h); marker.current?.remove(); };
  }, [map, lib]);
  useEffect(() => { marker.current?.setLngLat([coordinate.longitude, coordinate.latitude]); }, [coordinate.latitude, coordinate.longitude]);

  return createPortal(children, el);
}

/** "You are here": a small cobalt dot, only when the browser already allows location (never asks here). */
function MyLocation() {
  const [at, setAt] = useState<LatLng | null>(null);
  useEffect(() => { getNear({ ask: false }).then((n) => n && setAt({ latitude: n.lat, longitude: n.lng })); }, []);
  if (!at) return null;
  return (
    <Marker coordinate={at}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface, boxShadow: '0px 0px 0px 6px rgba(35,80,217,0.18)' }} />
    </Marker>
  );
}
