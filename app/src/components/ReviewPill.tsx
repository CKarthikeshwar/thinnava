import { StyleSheet, View } from 'react-native';
import { Frown, Meh, Smile } from 'lucide-react-native';
import { colors, fonts, radii, size } from '@/theme';
import { T } from './T';

export type Rating = 'good' | 'okayish' | 'bad';

export const ratingLook = {
  good: { label: 'Good', fg: colors.good, bg: colors.goodWash, Icon: Smile },
  okayish: { label: 'Okayish', fg: colors.okayish, bg: colors.okayishWash, Icon: Meh },
  bad: { label: 'Bad', fg: colors.bad, bg: colors.badWash, Icon: Frown },
} as const;

/** The only rating mark in the app (DESIGN.md "Review Pill"). Colours are fixed verdicts. */
export function ReviewPill({ rating, big }: { rating: Rating; big?: boolean }) {
  const r = ratingLook[rating];
  return (
    <View style={[styles.pill, big && styles.big, { backgroundColor: r.bg }]} accessible accessibilityLabel={`Rating: ${r.label}`}>
      <r.Icon size={big ? 19 : 16} color={r.fg} strokeWidth={2} />
      <T style={[styles.text, big && { fontSize: 15 }]} color={r.fg}>{r.label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { height: size.pill, borderRadius: radii.pill, paddingLeft: 7, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  big: { height: 32, paddingLeft: 10, paddingRight: 14, gap: 6 },
});
