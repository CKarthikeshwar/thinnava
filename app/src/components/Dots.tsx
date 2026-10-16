import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

/** Onboarding progress dots: the active one stretches into a short cobalt pill. */
export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Step ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.on]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.hairline },
  on: { width: 22, backgroundColor: colors.primary },
});
