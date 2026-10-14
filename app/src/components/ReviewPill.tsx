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
export function ReviewPill({ rating }: { rating: Rating }) {
  const r = ratingLook[rating];
  return (
    <View style={[styles.pill, { backgroundColor: r.bg }]} accessible accessibilityLabel={`Rating: ${r.label}`}>
      <r.Icon size={16} color={r.fg} strokeWidth={2} />
      <T style={styles.text} color={r.fg}>{r.label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { height: size.pill, borderRadius: radii.pill, paddingLeft: 7, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
});
