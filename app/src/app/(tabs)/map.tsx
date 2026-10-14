import { StyleSheet, View } from 'react-native';
import { Chip, Cluster, MapPin, Screen, SearchBar, T, YouDot } from '@/components';
import { colors, space } from '@/theme';

// B2 Map. The real Google map arrives in M8; this previews the pin styles on the map colours.
export default function MapTab() {
  return (
    <Screen scroll={false}>
      <View style={styles.map}>
        <View style={[styles.road, { top: 220 }]} />
        <View style={[styles.road, { top: 430 }]} />
        <View style={[styles.roadV, { left: 120 }]} />
        <View style={[styles.roadV, { left: 260 }]} />
        <View style={[styles.park, { top: 300, left: 20 }]} />
        <View style={[styles.at, { top: 190, left: 40 }]}><MapPin label="Bao Story" person="Ananya" /></View>
        <View style={[styles.at, { top: 260, left: 170 }]}><MapPin label="Burger Factory" glyph="friend" /></View>
        <View style={[styles.at, { top: 360, left: 60 }]}><MapPin label="MTR" glyph="went" mine /></View>
        <View style={[styles.at, { top: 470, left: 210 }]}><MapPin label="Toit" glyph="wishlist" /></View>
        <View style={[styles.at, { top: 540, left: 90 }]}><Cluster count={5} /></View>
        <View style={[styles.at, { top: 400, left: 300 }]}><YouDot /></View>
      </View>
      <View style={styles.top}>
        <SearchBar placeholder="Search places" />
        <View style={styles.chips}>
          <Chip label="All" selected />
          <Chip label="Visited" />
          <Chip label="Wishlist" />
          <Chip label="Connections" />
        </View>
        <T variant="label" style={styles.note}>Preview only: the real map arrives in M8.</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.mapLand },
  at: { position: 'absolute' },
  road: { position: 'absolute', left: 0, right: 0, height: 14, backgroundColor: colors.mapRoad, borderColor: colors.mapRoadEdge, borderTopWidth: 1, borderBottomWidth: 1 },
  roadV: { position: 'absolute', top: 0, bottom: 0, width: 14, backgroundColor: colors.mapRoad, borderColor: colors.mapRoadEdge, borderLeftWidth: 1, borderRightWidth: 1 },
  park: { position: 'absolute', width: 90, height: 70, borderRadius: 30, backgroundColor: colors.mapPark },
  top: { paddingTop: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: space.gutter, marginTop: 12 },
  note: { paddingHorizontal: space.gutter, marginTop: 10 },
});
