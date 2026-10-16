import { forwardRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Chip, IconButton, Pressable, Sheet, T } from '@/components';
import { addDays, MONTH_NAMES, todayIST } from '@/lib/dates';
import { colors, fonts, space } from '@/theme';

/** "When did you go?": Today / Yesterday chips plus a small month calendar. Future dates are disabled. */
export const DateSheet = forwardRef<BottomSheetModal, { value: string; onPick: (iso: string) => void }>(function DateSheet({ value, onPick }, ref) {
  const today = todayIST();
  const [month, setMonth] = useState(value.slice(0, 7)); // YYYY-MM
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const iso = (d: number) => `${month}-${String(d).padStart(2, '0')}`;
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const pick = (d: string) => { onPick(d); (ref as any)?.current?.dismiss(); };

  return (
    <Sheet ref={ref} title="When did you go?">
      <View style={styles.quick}>
        <Chip label="Today" selected={value === today} onPress={() => pick(today)} />
        <Chip label="Yesterday" selected={value === addDays(today, -1)} onPress={() => pick(addDays(today, -1))} />
      </View>
      <View style={styles.head}>
        <IconButton icon={ChevronLeft} label="Previous month" ghost onPress={() => shift(-1)} />
        <T variant="bodyStrong" style={{ flex: 1, textAlign: 'center' }}>{MONTH_NAMES[m - 1]} {y}</T>
        <IconButton icon={ChevronRight} label="Next month" ghost onPress={() => shift(1)} />
      </View>
      <View style={styles.grid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={i} style={styles.dow}>{d}</T>)}
        {cells.map((d, i) => {
          if (d === null) return <View key={'b' + i} style={styles.cell} />;
          const v = iso(d);
          const future = v > today;
          const on = v === value;
          return (
            <Pressable key={v} disabled={future} onPress={() => pick(v)} pressScale={0.9}
              accessibilityRole="button" accessibilityLabel={v} accessibilityState={{ selected: on, disabled: future }}
              style={[styles.cell, on && styles.on]}>
              <T style={[styles.day, future && { color: colors.hairline }, on && { color: colors.onPrimary }]}>{d}</T>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: 8, paddingHorizontal: space.sheet },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.sheet - 4 },
  dow: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkMuted, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  on: { backgroundColor: colors.primary },
  day: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
