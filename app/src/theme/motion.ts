import { Easing, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

// Motion: spec §16.7, DESIGN.md "Motion". Exits are faster than entrances; no bounce.
export const curves = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.bezier(0.05, 0.7, 0.1, 1), // things arriving
  accelerate: Easing.bezier(0.3, 0, 0.8, 0.15), // things leaving
  glide: Easing.bezier(0.2, 0.8, 0.2, 1), // card → place title glide
} as const;

export const durations = {
  press: 120,
  short: 150,
  tab: 280,
  slide: 300,
  dial: 250,
  dialStagger: 30,
  sheetIn: 400,
  sheetOut: 250,
  dialog: 200,
  snackIn: 300,
  snackOut: 200,
  snackHold: 3000,
  catClimb: 600,
  glide: 460,
} as const;

// Respect Android "Remove animations": callers use this to swap movement for a ≤150 ms fade.
export function useMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    // Duration to use for a movement; collapses to a short fade when animations are off.
    d: (ms: number) => (reduced ? Math.min(ms, durations.short) : ms),
  };
}

// Pass to withTiming/withSpring configs so Reanimated honours the system setting too.
export const reduceMotion = ReduceMotion.System;
