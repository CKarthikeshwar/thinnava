import Constants from 'expo-constants';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { mapStyle } from '@/theme/mapStyle';

/**
 * The Google map (spec §26.7), Android-only, so it lives in platform/. The Maps SDK crashes without an API key, so
 * the screen checks `mapsReady` (set from GOOGLE_MAPS_ANDROID_KEY at build time) and shows the place list instead
 * until the key exists.
 */
export const mapsReady = !!Constants.expoConfig?.extra?.mapsReady;

export { Marker, type Region } from 'react-native-maps';
export type MapRef = MapView;

export function GoogleMap(props: React.ComponentProps<typeof MapView> & { ref?: React.Ref<MapView> }) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      customMapStyle={mapStyle}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      moveOnMarkerPress={false}
      {...props}
    />
  );
}
