import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Screen, SearchBar, Segmented, T } from '@/components';
import { space } from '@/theme';

// B4 Search: Places | People. Real search arrives in M3 (places) and M6 (people).
export default function Search() {
  const [seg, setSeg] = useState<'places' | 'people'>('places');
  return (
    <Screen rings={1} contentStyle={styles.content}>
      <SearchBar placeholder={seg === 'places' ? 'Search places or a dish' : 'Search by username'} />
      <View style={styles.gap} />
      <Segmented options={[{ key: 'places', label: 'Places' }, { key: 'people', label: 'People' }]} value={seg} onChange={setSeg} />
      {seg === 'places' ? (
        <View style={styles.chips}>
          <Chip label="Someone I know went" />
          <Chip label="Category" dropdown />
          <Chip label="₹ Price" dropdown />
        </View>
      ) : null}
      <T variant="body" style={styles.note}>{seg === 'places' ? 'Place search arrives in M3.' : 'People search arrives in M6.'}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14 },
  gap: { height: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.gutter, marginTop: 14 },
  note: { paddingHorizontal: space.gutter, marginTop: 22 },
});
