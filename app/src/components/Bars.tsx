import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowLeft, Search, WifiOff, X, type LucideProps } from 'lucide-react-native';
import { colors, fonts, radii, shadows, size, space } from '@/theme';
import { IconButton } from './IconButton';
import { Pressable } from './Pressable';
import { T } from './T';
import { useNet } from '@/lib/net';

type TopBarProps = {
  /** Wordmark on Home; otherwise a screen title. */
  wordmark?: boolean;
  title?: string;
  onBack?: () => void;
  /** Show × instead of ← (forms that are dismissed, e.g. D2, F3). */
  close?: boolean;
  /** 19 dp title for flow screens (Add visit, Your visit, pickers), as in the phase2 mockups. */
  compact?: boolean;
  actions?: ReactNode;
};

/** 56 dp top app bar: wordmark or Fredoka title, 48 dp round actions on the right. */
export function TopBar({ wordmark, title, onBack, close, compact, actions }: TopBarProps) {
  return (
    <>
    <View style={[styles.bar, onBack && styles.withBack]}>
      {onBack ? <IconButton icon={close ? X : ArrowLeft} label={close ? 'Close' : 'Back'} ghost onPress={onBack} /> : null}
      <View style={styles.titleWrap}>
        {wordmark ? (
          <T variant="wordmark" accessibilityRole="header">Thinnava</T>
        ) : title ? (
          <T variant="screenTitle" style={compact ? { fontSize: 19, lineHeight: 23 } : undefined} numberOfLines={1} accessibilityRole="header">{title}</T>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
    <OfflineStrip />
    </>
  );
}

/** F8 (spec §13): the offline strip, shown only while offline. Every TopBar carries it. */
export function OfflineStrip() {
  const online = useNet((s) => s.online);
  return online ? null : <OfflineBanner />;
}

/** Pill search bar (opens a search screen or filters in place). */
export function SearchBar({ placeholder, value, onPress, trailing }: { placeholder: string; value?: string; onPress?: () => void; trailing?: ReactNode }) {
  return (
    <Pressable onPress={onPress} pressScale={0.99} style={styles.search} accessibilityRole="search" accessibilityLabel={placeholder}>
      <Search size={22} color={colors.inkSoft} strokeWidth={2} />
      <T style={styles.searchText} color={value ? colors.ink : colors.inkMuted} numberOfLines={1}>{value || placeholder}</T>
      {trailing}
    </Pressable>
  );
}

/** Segmented control: Surface Tint track, white selected segment. */
export function Segmented<K extends string>({ options, value, onChange, compact, style }: { options: { key: K; label: string; icon?: ComponentType<LucideProps> }[]; value: K; onChange: (k: K) => void; /** Web: segments sized to their labels, no side margin. */ compact?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.seg, compact && styles.segCompact, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            pressScale={0.98}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segItem, compact && styles.segItemCompact, on && styles.segOn]}
          >
            {o.icon ? <o.icon size={18} color={on ? colors.ink : colors.inkSoft} strokeWidth={2} /> : null}
            <T style={styles.segText} color={on ? colors.ink : colors.inkSoft}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Dark strip under the top bar while offline (F8). */
export function OfflineBanner() {
  return (
    <View style={styles.offline} accessibilityLiveRegion="polite">
      <WifiOff size={16} color={colors.onPrimary} strokeWidth={2} />
      <T variant="label" color={colors.onPrimary}>You're offline · changes will sync</T>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: size.topBar, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: space.gutter, paddingRight: 10 },
  withBack: { paddingLeft: 6 },
  titleWrap: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  search: { height: 52, borderRadius: radii.pill, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 18, paddingRight: 8, marginHorizontal: space.gutter, boxShadow: shadows.search },
  searchText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15.5 },
  seg: { flexDirection: 'row', backgroundColor: colors.surfaceTint, borderRadius: radii.pill, padding: 4, marginHorizontal: space.gutter },
  segItem: { flex: 1, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  segCompact: { marginHorizontal: 0, alignSelf: 'flex-start', borderRadius: 12, padding: 3 },
  segItemCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', height: 34, paddingHorizontal: 13, borderRadius: 9 },
  segOn: { backgroundColor: colors.surface, boxShadow: shadows.segment },
  segText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  offline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 34, backgroundColor: colors.ink },
});
