import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RingsGround } from '@/components';
import { IntroPage } from '@/features/auth/onboarding/IntroPage';
import { WelcomePage } from '@/features/auth/onboarding/WelcomePage';
import { colors } from '@/theme';

/**
 * Onboarding pager (spec §14 A1b → A2): swipe, Next or Skip between Intro and Welcome.
 * Each page keeps its own dots (the splash is step 1 of 3). Android back on Welcome returns to Intro.
 */
export default function Onboarding() {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const goTo = (i: number) => ref.current?.scrollTo({ x: i * width, animated: true });

  useEffect(() => {
    if (page === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { goTo(0); setPage(0); return true; });
    return () => sub.remove();
  }, [page, width]);

  return (
    <View style={styles.root}>
      <RingsGround variant={page === 0 ? 1 : 2} />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          <View style={{ width }}><IntroPage onNext={() => { goTo(1); setPage(1); }} /></View>
          <View style={{ width }}><WelcomePage /></View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
