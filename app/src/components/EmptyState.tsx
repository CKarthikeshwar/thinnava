import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, shadows } from '@/theme';
import { CatPeek } from './CatPeek';
import { T } from './T';

type Props = { title: string; body?: string; children?: ReactNode; cat?: boolean };

/** Empty state: the peeking cat over a white card with a title, a line, and the actions to start. */
export function EmptyState({ title, body, children, cat = true }: Props) {
  return (
    <View style={styles.wrap}>
      {cat ? <CatPeek width={170} /> : null}
      <View style={styles.card}>
        <T variant="title" style={styles.center}>{title}</T>
        {body ? <T variant="body" style={[styles.center, styles.body]}>{body}</T> : null}
        {children ? <View style={styles.actions}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14 },
  card: { backgroundColor: colors.surface, borderRadius: radii.surface, padding: 18, paddingTop: 34, boxShadow: shadows.panel, zIndex: 1 },
  center: { textAlign: 'center' },
  body: { marginTop: 8 },
  actions: { marginTop: 18, gap: 10 },
});
