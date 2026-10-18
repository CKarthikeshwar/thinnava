import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { create } from 'zustand';

/**
 * Online state (spec §13, §26.5) from NetInfo. "Unknown" counts as online, so a slow first check never blocks saves;
 * only a definite "no connection" or "no internet" counts as offline.
 */
const isUp = (s: NetInfoState) => s.isConnected !== false && s.isInternetReachable !== false;

export const useNet = create<{ online: boolean }>(() => ({ online: true }));
export const isOnline = () => useNet.getState().online;

/** Called once at startup: keeps useNet and React Query's onlineManager in step with NetInfo. */
export function startNetWatch(onBackOnline: () => void) {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((s) => {
      const up = isUp(s);
      const was = useNet.getState().online;
      useNet.setState({ online: up });
      setOnline(up);
      if (up && !was) onBackOnline();
    }));
}
