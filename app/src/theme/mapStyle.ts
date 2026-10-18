import { colors } from './tokens';

/**
 * Google map style (spec §26.7, DESIGN.md map colours): Mist land, white roads, soft blue water, sage parks.
 * Business POIs are hidden so only our pins speak; JSON styling only, never a Map ID (a Map ID would make the
 * Maps SDK billable, spec §27.5).
 */
export const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: colors.mapLand }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.inkMuted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.mapLand }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: colors.mapPark }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: colors.mapRoad }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: colors.mapRoadEdge }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.mapWater }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: colors.mapRoadEdge }] },
];
