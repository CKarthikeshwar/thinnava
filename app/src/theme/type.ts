import type { TextStyle } from 'react-native';
import { colors } from './tokens';

// Two voices (DESIGN.md "The Two Voices Rule"): Fredoka for brand, headings and places; Nunito for everything else.
export const fonts = {
  display: 'Fredoka_600SemiBold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 42, letterSpacing: 0.4, color: colors.primaryStrong },
  wordmark: { fontFamily: fonts.display, fontSize: 24, color: colors.primaryStrong },
  headline: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.ink },
  screenTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.ink },
  place: { fontFamily: fonts.display, fontSize: 17.5, lineHeight: 21, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  bodyStrong: { fontFamily: fonts.bodyHeavy, fontSize: 15.5, lineHeight: 19, color: colors.ink },
  card: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  label: { fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 16, color: colors.inkSoft },
  meta: { fontFamily: fonts.bodySemi, fontSize: 12.5, lineHeight: 16, color: colors.inkMuted },
  fieldLabel: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 17, color: colors.inkSoft },
  button: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.onPrimary },
  buttonSmall: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.onPrimary },
  price: { fontFamily: fonts.bodyHeavy, fontSize: 13.5, color: colors.ink },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

// Text may grow with the system font size up to 130% without breaking layouts (spec §16.9).
export const MAX_FONT_SCALE = 1.3;
