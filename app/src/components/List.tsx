import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, radii, space } from '@/theme';
import { Pressable } from './Pressable';
import { T } from './T';

/** White list surface rising from the ground with 26 dp top corners. */
export function ListSurface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

/** Rounded white panel (settings groups, inline panels). */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: string }) {
  return <T style={styles.section} variant="fieldLabel" color={colors.inkMuted}>{children}</T>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

type RowProps = {
  leading?: ReactNode; // 48 dp thumb, avatar or source mark
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
};

/** List row: leading visual, 800-weight name, muted one-line sub. */
export function ListRow({ leading, title, subtitle, trailing, chevron, onPress }: RowProps) {
  const content = (
    <>
      {leading}
      <View style={styles.rowText}>
        <T variant="bodyStrong" numberOfLines={1}>{title}</T>
        {subtitle ? <T variant="meta" style={styles.sub} numberOfLines={1}>{subtitle}</T> : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={22} color={colors.inkMuted} strokeWidth={2} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable onPress={onPress} pressScale={0.99} style={styles.row} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}>
      {content}
    </Pressable>
  );
}

/** 48 dp rounded-square thumbnail with an icon (places). */
export function Thumb({ children }: { children: ReactNode }) {
  return <View style={styles.thumb}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: { backgroundColor: colors.surface, borderTopLeftRadius: radii.surface, borderTopRightRadius: radii.surface, paddingTop: 6, flexGrow: 1 },
  panel: { backgroundColor: colors.surface, borderRadius: radii.panel, overflow: 'hidden' },
  section: { paddingTop: 14, paddingHorizontal: space.gutter, paddingBottom: 4, letterSpacing: 0.26 },
  divider: { height: 1, backgroundColor: colors.hairline, marginHorizontal: space.gutter },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: space.gutter, minHeight: 48 },
  rowText: { flex: 1, minWidth: 0 },
  sub: { fontSize: 13, marginTop: 2 },
  thumb: { width: 48, height: 48, borderRadius: radii.thumb, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
});
