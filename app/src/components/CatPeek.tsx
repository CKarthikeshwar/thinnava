import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { curves, durations, reduceMotion, useMotion } from '@/theme';

const PEEK = require('../../assets/images/cat-peek.png');
const RATIO = 612 / 640; // cat-peek.png height / width

/**
 * The chef cat peeking over the top edge of the card below it (DESIGN.md "Chef cat climb").
 * Place it directly above a card; its paws overlap the card's top edge.
 * It rises from behind the edge (600 ms, decelerate). With animations off it simply fades in.
 */
export function CatPeek({ width = 150, delay = 120 }: { width?: number; delay?: number }) {
  const h = Math.round(width * RATIO);
  const overlap = Math.round(width * 0.075); // paws over the card edge (-11 px at 150 px in the mockup)
  const { reduced } = useMotion();
  const rise = useSharedValue(reduced ? 0 : h * 0.62);
  const fade = useSharedValue(reduced ? 0 : 1);

  useEffect(() => {
    if (reduced) {
      fade.value = withTiming(1, { duration: durations.short });
    } else {
      rise.value = withDelay(delay, withTiming(0, { duration: durations.catClimb, easing: curves.decelerate, reduceMotion }));
    }
  }, [reduced]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }], opacity: fade.value }));

  return (
    // The clip box ends at the card's top edge + overlap, so the cat appears to climb up from behind the card.
    <View style={[styles.clip, { width, height: h, marginBottom: -overlap }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={anim}>
        <Image source={PEEK} style={{ width, height: h }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { alignSelf: 'center', overflow: 'hidden', zIndex: 2 },
});
