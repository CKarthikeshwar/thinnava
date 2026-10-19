import { forwardRef, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Button, Chip, Sheet, T, showSnack } from '@/components';
import { FnError } from '@/lib/functions';
import { colors, fonts, radii, space } from '@/theme';
import { addCustomPlace, CATEGORY_LABEL, type Category, type Place } from './api';

const KINDS: Category[] = ['restaurant', 'cafe', 'bakery', 'street_food', 'fast_food', 'dessert', 'bar', 'tea_shop'];

type Props = { initialName: string; onAdded: (p: Place) => void };

/**
 * "Add a place yourself" (spec §25.7): for a place no search knows. A name, an optional area and a kind; it's placed
 * roughly at its area on the map. Anyone can then find and log it like any other place.
 */
export const AddPlaceSheet = forwardRef<BottomSheetModal, Props>(function AddPlaceSheet({ initialName, onAdded }, ref) {
  const [name, setName] = useState(initialName);
  const [area, setArea] = useState('');
  const [kind, setKind] = useState<Category>('restaurant');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(initialName); }, [initialName]);
  const ok = name.trim().length >= 2;

  const add = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      const place = await addCustomPlace(name.trim(), area.trim(), kind);
      (ref as { current?: BottomSheetModal | null })?.current?.dismiss();
      setArea('');
      onAdded(place);
    } catch (e) {
      showSnack({ text: e instanceof FnError && e.code === 'daily_limit' ? "You've added a lot of places today. Try again tomorrow." : "Couldn't add the place. Try again." });
    }
    setBusy(false);
  };

  return (
    <Sheet ref={ref} title="Add a place">
      <T style={styles.label}>Name</T>
      <View style={styles.field}>
        <BottomSheetTextInput value={name} onChangeText={(t) => setName(t.slice(0, 80))} placeholder="e.g. Ramu's Dosa Corner" placeholderTextColor={colors.inkMuted}
          style={styles.input} autoCapitalize="words" returnKeyType="next" />
      </View>
      <T style={styles.label}>Area <T style={styles.opt}>optional</T></T>
      <View style={styles.field}>
        <BottomSheetTextInput value={area} onChangeText={(t) => setArea(t.slice(0, 60))} placeholder="e.g. Jayanagar" placeholderTextColor={colors.inkMuted}
          style={styles.input} autoCapitalize="words" returnKeyType="done" onSubmitEditing={add} />
      </View>
      <T style={styles.label}>What kind of place?</T>
      <View style={styles.kinds}>
        {KINDS.map((k) => <Chip key={k} label={CATEGORY_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />)}
      </View>
      <Button label={busy ? 'Adding…' : 'Add place'} disabled={!ok || busy} onPress={add} style={styles.btn} />
      <T variant="meta" style={styles.note}>Anyone on Thinnava can find places you add. It's shown near its area on the map.</T>
    </Sheet>
  );
});

/**
 * Credit for place data (Ola Maps terms §15, OpenStreetMap ODbL): "Ola Maps" links to OpenStreetMap's copyright page,
 * as Ola asks. Shown under place search results.
 */
export function PlaceCredit() {
  return (
    <T variant="meta" style={styles.credit} accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}>
      Places from <T variant="meta" style={styles.creditLink}>Ola Maps</T> and <T variant="meta" style={styles.creditLink}>© OpenStreetMap</T> contributors
    </T>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft, paddingHorizontal: space.sheet, paddingTop: 12, paddingBottom: 6 },
  opt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkMuted },
  field: { marginHorizontal: space.sheet, height: 52, borderRadius: radii.field, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1.5px ${colors.hairline}`, justifyContent: 'center', paddingHorizontal: 16 },
  input: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.sheet },
  btn: { marginHorizontal: space.sheet, marginTop: 18, alignSelf: 'auto' },
  note: { paddingHorizontal: space.sheet, paddingTop: 10, paddingBottom: 8, textAlign: 'center' },
  credit: { textAlign: 'center', paddingHorizontal: space.gutter, paddingVertical: 10, fontSize: 11.5 },
  creditLink: { fontSize: 11.5, textDecorationLine: 'underline' },
});
