import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RingsGround, T } from '@/components';
import { colors, durations } from '@/theme';

const WAVING = require('../../../assets/images/cat-waving.png');

/** A1 Splash: the waving chef cat, wordmark and "Did you eat?" while the session loads (spec §14 A1). */
export function Splash() {
  return (
    <View style={styles.root} accessibilityLabel="Thinnava, loading">
      <RingsGround variant={0} />
      <Animated.View entering={FadeIn.duration(durations.slide)} style={styles.center}>
        <Image source={WAVING} style={styles.cat} contentFit="contain" />
        <T variant="display" style={styles.word}>Thinnava</T>
        <T variant="body" style={styles.sub}>Did you eat?</T>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 60 },
  cat: { width: 200, height: 200 * (580 / 452), filter: [{ dropShadow: { offsetX: 0, offsetY: 18, standardDeviation: 18, color: 'rgba(20,40,80,0.18)' } }] },
  word: { marginTop: 14 },
  sub: { fontFamily: 'Nunito_700Bold' },
});
