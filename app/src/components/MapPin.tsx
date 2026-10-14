import { StyleSheet, View } from 'react-native';
import { Check, Globe, Heart, UserRound } from 'lucide-react-native';
import { colors, fonts, shadows } from '@/theme';
import { Avatar } from './Avatar';
import { T } from './T';

type Glyph = 'wishlist' | 'went' | 'internet' | 'friend';
const glyphIcon = { wishlist: Heart, went: Check, internet: Globe, friend: UserRound };

type Props = {
  label: string; // place name
  person?: string; // avatar of who went
  glyph?: Glyph; // otherwise a glyph circle
  mine?: boolean; // my own pins invert to cobalt
  selected?: boolean;
};

/** Map pin bubble with a tail (DESIGN.md "Map Pins"). Rendered inside a map Marker in M8. */
export function MapPin({ label, person, glyph = 'went', mine, selected }: Props) {
  const Icon = glyphIcon[glyph];
  const bg = mine ? colors.primary : colors.surface;
  const fg = mine ? colors.onPrimary : colors.ink;
  return (
    <View style={styles.pin}>
      <View style={[styles.bub, { backgroundColor: bg }, selected && styles.sel]}>
        {person ? (
          <Avatar name={person} size={24} />
        ) : (
          <View style={[styles.g, mine && styles.gMine]}>
            <Icon size={14} color={mine ? colors.onPrimary : colors.primaryStrong} strokeWidth={2.2} />
          </View>
        )}
        <T style={styles.label} color={fg} numberOfLines={1}>{label}</T>
      </View>
      <View style={[styles.tail, { backgroundColor: bg }]} />
    </View>
  );
}

/** Cluster for busy areas: 38 dp Deep Cobalt circle with a white halo. */
export function Cluster({ count }: { count: number }) {
  return (
    <View style={styles.cluster} accessibilityLabel={`${count} places`}>
      <T style={styles.clusterText} color={colors.onPrimary}>{count}</T>
    </View>
  );
}

/** The user's location: cobalt dot with white and translucent rings. */
export function YouDot() {
  return <View style={styles.you} />;
}

const styles = StyleSheet.create({
  pin: { alignItems: 'center' },
  bub: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 10, boxShadow: shadows.pin, maxWidth: 180 },
  sel: { boxShadow: `0px 0px 0px 3px ${colors.primary}, 0px 6px 16px -4px rgba(10,20,40,0.4)` },
  g: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  gMine: { backgroundColor: 'rgba(255,255,255,0.2)' },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 12.5 },
  tail: { width: 10, height: 10, transform: [{ rotate: '45deg' }], marginTop: -6 },
  cluster: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 0px 0px 5px rgba(255,255,255,0.7)' },
  clusterText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  you: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, boxShadow: `0px 0px 0px 4px #FFFFFF, 0px 0px 0px 14px rgba(35,80,217,0.18)` },
});
