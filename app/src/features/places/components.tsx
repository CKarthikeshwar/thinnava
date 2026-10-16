import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Beer, Bike, Coffee, Croissant, CupSoda, IceCreamCone, Sandwich, Search, Soup, Store, Utensils, X, type LucideProps } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { ListRow, Pressable, T, Thumb } from '@/components';
import { dotJoin, formatDistance } from '@/lib/format';
import { colors, fonts, MAX_FONT_SCALE, radii, shadows, space } from '@/theme';
import { CATEGORY_LABEL, isClosed, type Category, type Place } from './api';

const ICON: Record<Category, ComponentType<LucideProps>> = {
  restaurant: Utensils, cafe: Coffee, bakery: Croissant, dhaba: Utensils, tea_shop: CupSoda, fast_food: Sandwich,
  dessert: IceCreamCone, bar: Beer, street_food: Soup, delivery_only: Bike,
};

export function CategoryThumb({ category, size }: { category: Category | null; size?: number }) {
  const Icon = category ? ICON[category] : Store;
  return <Thumb size={size}><Icon size={22} color={colors.primaryStrong} strokeWidth={2} /></Thumb>;
}

/** A place in a list: category thumb, name, "area · category · distance". */
export function PlaceRow({ place, onPress, trailing, chevron }: { place: Place; onPress: () => void; trailing?: React.ReactNode; chevron?: boolean }) {
  const sub = dotJoin(place.area, place.category && CATEGORY_LABEL[place.category], formatDistance(place.distanceM), isClosed(place) && 'Permanently closed');
  return <ListRow leading={<CategoryThumb category={place.category} />} title={place.name} subtitle={sub} trailing={trailing} chevron={chevron} onPress={onPress} />;
}

type FieldProps = TextInputProps & { onClear?: () => void };

/** Pill search field with a clear button (a real input, unlike the tappable SearchBar). */
export const SearchField = forwardRef<TextInput, FieldProps>(function SearchField({ value, onClear, style, ...rest }, ref) {
  return (
    <View style={styles.search}>
      <Search size={22} color={colors.inkSoft} strokeWidth={2} />
      <TextInput
        ref={ref}
        value={value}
        placeholderTextColor={colors.inkMuted}
        cursorColor={colors.primary}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        returnKeyType="search"
        autoCorrect={false}
        style={[styles.input, style]}
        {...rest}
      />
      {value ? (
        <Pressable onPress={onClear} hitSlop={10} style={styles.clear} accessibilityRole="button" accessibilityLabel="Clear search">
          <X size={18} color={colors.inkSoft} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
});

/** Small grey note under results in practice mode, so made-up data is never mistaken for Google's. */
export function PracticeNote() {
  return <T variant="meta" style={styles.practice}>Practice data · real Google results arrive after the Google Cloud setup</T>;
}

const styles = StyleSheet.create({
  search: { height: 52, borderRadius: radii.pill, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 18, paddingRight: 8, marginHorizontal: space.gutter, boxShadow: shadows.search },
  input: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15.5, color: colors.ink, paddingVertical: 0 },
  clear: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  practice: { paddingHorizontal: space.gutter, paddingVertical: 10, textAlign: 'center' },
});
