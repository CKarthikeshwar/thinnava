import * as Location from 'expo-location';
import { create } from 'zustand';

/**
 * Location with the in-context explainer (spec §14 A7): the first time a feature wants location,
 * we show "Show places near you?" before Android's own prompt. Denying never blocks anything.
 */
type State = { explainerOpen: boolean; resolve: ((allow: boolean) => void) | null };
export const useLocationExplainer = create<State>(() => ({ explainerOpen: false, resolve: null }));

function askExplainer(): Promise<boolean> {
  return new Promise((resolve) => {
    useLocationExplainer.setState({
      explainerOpen: true,
      resolve: (allow) => { useLocationExplainer.setState({ explainerOpen: false, resolve: null }); resolve(allow); },
    });
  });
}

/** Returns the device position, or null if not allowed / unavailable. Never throws. */
export async function getNear(opts: { ask: boolean }): Promise<{ lat: number; lng: number } | null> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      if (!opts.ask || !perm.canAskAgain) return null;
      if (!(await askExplainer())) return null;
      perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return null;
    }
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 });
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
