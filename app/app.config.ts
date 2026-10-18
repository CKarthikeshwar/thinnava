// eslint-disable-next-line @typescript-eslint/no-require-imports
const { existsSync } = require('fs') as { existsSync: (p: string) => boolean };
import type { ExpoConfig, ConfigContext } from 'expo/config';

// Thinnava app config. See spec.md §18, §27.
// Secrets/keys come from env (app/.env, never committed). See .env.example.
const APP_ENV = process.env.APP_ENV ?? 'dev';
// Push (spec §26.9): Firebase config from the free `thinnava-f44c7` project (Spark) (git-ignored) and the Expo project id.
const GOOGLE_SERVICES = './google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === 'prod' ? 'Thinnava' : 'Thinnava (dev)',
  slug: 'thinnava',
  scheme: 'thinnava',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light', // light mode only (spec §4.3)
  icon: './assets/icon.png', // interim chef-cat icon (spec §16.8)
  android: {
    package: 'com.thinnava.app',
    adaptiveIcon: {
      backgroundColor: '#2350D9',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    ...(existsSync(GOOGLE_SERVICES) ? { googleServicesFile: GOOGLE_SERVICES } : {}),
  },
  // Web version (spec §18.3): a single-page site; public/ holds index.html, the manifest and home-screen icons.
  web: { bundler: 'metro', output: 'single', name: 'Thinnava', shortName: 'Thinnava', lang: 'en', themeColor: '#FFFFFF', backgroundColor: '#EEF2FF', favicon: './assets/icon.png' },
  plugins: [
    'expo-router',
    // Splash: the peeking chef cat on Mist (spec §16.8). The full splash (A1) with wordmark is drawn in JS.
    ['expo-splash-screen', { image: './assets/splash-icon.png', backgroundColor: '#EEF2FF', imageWidth: 200 }],
    // Android share target for text and URLs (spec §10.1, §26.6). iOS is out of scope.
    ['expo-share-intent', { androidIntentFilters: ['text/*'], disableIOS: true }],
    '@react-native-google-signin/google-signin',
    ['expo-notifications', { color: '#2350D9' }],
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? '' }],
    [
      'expo-location',
      { locationWhenInUsePermission: 'Thinnava uses your location to centre the map and list nearby places first.' },
    ],
  ],
  experiments: { typedRoutes: true },
  // The map screen shows the place list instead of the map until a Maps key exists (the SDK crashes without one).
  extra: { APP_ENV, mapsReady: !!process.env.GOOGLE_MAPS_ANDROID_KEY, ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}) },
});
