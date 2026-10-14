import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '@/theme';

// Three compositions from design/phase1.html (viewBox 360×780): thin concentric arcs from opposite corners + one primary dot.
const compositions: { rings: [number, number, number[]][]; dot: [number, number] }[] = [
  { rings: [[360, 0, [120, 170, 220, 270]], [0, 780, [110, 160, 210]]], dot: [340, 150] },
  { rings: [[0, 60, [90, 140, 190]], [360, 720, [100, 150, 200, 250]]], dot: [20, 330] },
  { rings: [[180, -60, [160, 210, 260]], [380, 560, [70, 120]]], dot: [342, 452] },
];

/**
 * Flat Mist ground with the Rings art (DESIGN.md "Ground: Rings").
 * Only on onboarding and the four main tabs; every other screen is plain Mist.
 */
export function RingsGround({ variant = 0 }: { variant?: 0 | 1 | 2 }) {
  const c = compositions[variant];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 360 780" preserveAspectRatio="xMidYMid slice">
        {c.rings.map(([cx, cy, radii], i) => (
          <G key={i} fill="none" stroke={colors.rings} strokeWidth={1.4}>
            {radii.map((r) => <Circle key={r} cx={cx} cy={cy} r={r} />)}
          </G>
        ))}
        <Circle cx={c.dot[0]} cy={c.dot[1]} r={5} fill={colors.primary} opacity={0.55} />
      </Svg>
    </View>
  );
}
