import { Text, type TextProps } from 'react-native';
import { MAX_FONT_SCALE, type, type TypeVariant } from '@/theme';

type Props = TextProps & { variant?: TypeVariant; color?: string };

/** All app text goes through T so the two type voices and font scaling stay consistent. */
export function T({ variant = 'body', color, style, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[type[variant], color ? { color } : null, style]}
      {...rest}
    />
  );
}
