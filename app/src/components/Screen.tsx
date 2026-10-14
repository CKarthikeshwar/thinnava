import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { RingsGround } from './RingsGround';

type Props = {
  children: ReactNode;
  /** Rings only on onboarding and the four main tabs (DESIGN.md "Ground"). */
  rings?: 0 | 1 | 2;
  header?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Bottom safe area is handled by the nav bar on tab screens. */
  edges?: ('top' | 'bottom')[];
};

/** Screen scaffold: Mist ground (+ optional Rings), safe area, optional fixed header and scrolling body. */
export function Screen({ children, rings, header, scroll = true, contentStyle, edges = ['top'] }: Props) {
  return (
    <View style={styles.root}>
      {rings !== undefined ? <RingsGround variant={rings} /> : null}
      <SafeAreaView edges={edges} style={styles.flex}>
        {header}
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
});
