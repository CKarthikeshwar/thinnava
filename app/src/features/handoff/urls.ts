import { Linking } from 'react-native';

// Hand-offs (spec §11.1): plain links, free, no API.
export const directionsUrl = (name: string, placeId: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}${placeId.startsWith('practice:') ? '' : `&query_place_id=${encodeURIComponent(placeId)}`}`;

/** Owner-tested 2026-10-12: opens the Swiggy app with search results. */
export const swiggyUrl = (name: string) => `https://www.swiggy.com/search?query=${encodeURIComponent(name)}`;

export const open = (url: string) => Linking.openURL(url).catch(() => {});
