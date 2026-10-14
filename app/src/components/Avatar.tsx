import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Globe, UserRound } from 'lucide-react-native';
import { avatarTints, colors, fonts } from '@/theme';
import { T } from './T';

function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarTints[h % avatarTints.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase().slice(0, parts.length > 1 ? 2 : 1);
}

type Props = { name: string; uri?: string | null; size?: number; ring?: boolean };

/** Person avatar: Google photo if available, else initials on one of five fixed tints. */
export function Avatar({ name, uri, size = 40, ring }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ring ? { boxShadow: `0px 0px 0px 2px ${colors.surface}` } : null;
  if (uri) {
    return (
      <View style={[box, ringStyle]}>
        <Image source={{ uri }} style={box} accessibilityLabel={name} />
      </View>
    );
  }
  return (
    <View style={[styles.av, box, { backgroundColor: tintFor(name) }, ringStyle]} accessible accessibilityLabel={name}>
      <T style={{ fontFamily: fonts.bodyHeavy, fontSize: Math.round(size * 0.38) }} color="#FFFFFF">{initials(name)}</T>
    </View>
  );
}

/** Overlapping stack of small avatars (who's been). */
export function AvatarStack({ names, size = 24 }: { names: string[]; size?: number }) {
  return (
    <View style={styles.stack}>
      {names.map((n, i) => (
        <View key={n + i} style={{ marginLeft: i === 0 ? 0 : -7 }}>
          <Avatar name={n} size={size} ring />
        </View>
      ))}
    </View>
  );
}

/** Mark for entries not posted by a person: a friend's experience (person) or an internet find (globe). */
export function SourceMark({ kind, size = 40 }: { kind: 'friend' | 'internet'; size?: number }) {
  const Icon = kind === 'friend' ? UserRound : Globe;
  return (
    <View style={[styles.av, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceTint }]}>
      <Icon size={Math.round(size / 2)} color={colors.primaryStrong} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row' },
});
