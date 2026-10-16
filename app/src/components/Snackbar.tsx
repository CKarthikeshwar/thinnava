import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut, SlideInDown } from 'react-native-reanimated';
import { create } from 'zustand';
import { colors, curves, durations, fonts, radii } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

type Snack = { id: number; text: string; action?: { label: string; onPress: () => void } };

const useSnackStore = create<{ snack: Snack | null; show: (s: Omit<Snack, 'id'>) => void; hide: () => void }>((set) => ({
  snack: null,
  show: (s) => set({ snack: { ...s, id: Date.now() } }),
  hide: () => set({ snack: null }),
}));

/** Show a snackbar from anywhere: showSnack({ text: 'Added to your wishlist', action: { label: 'Undo', onPress } }). */
export const showSnack = (s: Omit<Snack, 'id'>) => useSnackStore.getState().show(s);

/** Mounted once in the root layout. Rises 300 ms, stays 3 s, leaves 200 ms. */
export function SnackbarHost({ bottom = 96 }: { bottom?: number }) {
  const { snack, hide } = useSnackStore();
  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(hide, durations.snackHold);
    return () => clearTimeout(t);
  }, [snack?.id]);
  if (!snack) return null;
  return (
    <Animated.View
      key={snack.id}
      entering={SlideInDown.duration(durations.snackIn).easing(curves.decelerate.factory())}
      exiting={FadeOut.duration(durations.snackOut)}
      style={[styles.bar, { bottom }]}
      accessibilityLiveRegion="polite"
    >
      <T style={styles.text} color={colors.onPrimary} numberOfLines={2}>{snack.text}</T>
      {snack.action ? (
        <Pressable onPress={() => { snack.action!.onPress(); hide(); }} hitSlop={10} accessibilityRole="button">
          <T style={styles.action} color={colors.primaryContainer}>{snack.action.label}</T>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 12, right: 12, minHeight: 50, borderRadius: 14, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, zIndex: 50, boxShadow: '0px 10px 24px -10px rgba(0,0,0,0.5)' },
  text: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5 },
  action: { fontFamily: fonts.bodyHeavy, fontSize: 14.5 },
});
