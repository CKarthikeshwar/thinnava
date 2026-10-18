import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Chip, T } from '@/components';
import { CATEGORY_LABEL, type Category } from '@/features/places/api';
import { myConnections, PRICE_BUCKETS } from '@/features/people/api';
import { space } from '@/theme';
import { NO_FILTERS, type MapFilters } from './api';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

/**
 * B2a Map filters (spec §14): price per person, categories (multi-select) and one connection. Changes apply straight
 * away; "Clear filters" resets them. Hidden places come back as soon as a filter is removed.
 */
export function FilterSheet({ value, onChange, hidePerson }: { value: MapFilters; onChange: (f: MapFilters) => void; hidePerson?: boolean }) {
  const conns = useQuery({ queryKey: ['connections'], queryFn: myConnections, enabled: !hidePerson });
  const set = (patch: Partial<MapFilters>) => onChange({ ...value, ...patch });
  const any = value.price || value.categories.length || (!hidePerson && value.person);
  return (
    <View style={styles.body}>
      <T variant="fieldLabel" style={styles.label}>Price per person</T>
      <View style={styles.wrap}>
        <Chip label="Any" selected={!value.price} onPress={() => set({ price: null })} />
        {PRICE_BUCKETS.map((b) => <Chip key={b.key} label={b.label} selected={value.price === b.key} onPress={() => set({ price: value.price === b.key ? null : b.key })} />)}
      </View>
      <T variant="fieldLabel" style={styles.label}>Type of place</T>
      <View style={styles.wrap}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={CATEGORY_LABEL[c]} selected={value.categories.includes(c)}
            onPress={() => set({ categories: value.categories.includes(c) ? value.categories.filter((x) => x !== c) : [...value.categories, c] })} />
        ))}
      </View>
      {!hidePerson && conns.data?.length ? (
        <>
          <T variant="fieldLabel" style={styles.label}>Someone's places</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label="Anyone" selected={!value.person} onPress={() => set({ person: null })} />
            {conns.data.map((c) => (
              <Chip key={c.id} label={c.display_name.split(' ')[0]} selected={value.person === c.id}
                onPress={() => set({ person: value.person === c.id ? null : c.id })} />
            ))}
          </ScrollView>
        </>
      ) : null}
      {any ? <Button label="Clear filters" variant="outline" small style={styles.clear} onPress={() => onChange({ ...NO_FILTERS, person: hidePerson ? value.person : null })} /> : null}
    </View>
  );
}

export const filterCount = (f: MapFilters, hidePerson?: boolean) => (f.price ? 1 : 0) + (f.categories.length ? 1 : 0) + (!hidePerson && f.person ? 1 : 0);

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.gutter, paddingBottom: 8 },
  label: { marginTop: 14, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { gap: 8, paddingRight: space.gutter },
  clear: { alignSelf: 'flex-start', marginTop: 18 },
});
