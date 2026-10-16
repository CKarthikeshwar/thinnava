import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Avatar, Button, Chip, Pressable, T, showSnack } from '@/components';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, space } from '@/theme';
import { askPushInContext } from '@/features/notifications/push';
import { cancelRequest, PEOPLE_KEYS, respondRequest, sendRequest, type Person, type Relation } from './api';

/** Re-fetch everything a relationship change can affect. */
export function useRefreshPeople() {
  const qc = useQueryClient();
  return () => Promise.all(PEOPLE_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
}

/** Connect / cancel / accept with one tap, as the status button and E2 use it. */
export function useRelationAction() {
  const refresh = useRefreshPeople();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (p: Person, relation: Relation) => {
    if (busy) return;
    setBusy(p.id);
    try {
      if (relation === 'none') {
        const r = await sendRequest(p.id);
        // When it connects, the E5 sheet says so; no snackbar on top of it.
        if (r !== 'connected') { showSnack({ text: `Request sent to ${first(p)}` }); askPushInContext(first(p)); }
      } else if (relation === 'requested') {
        await cancelRequest(p.id);
        showSnack({ text: 'Request cancelled' });
      } else if (relation === 'incoming') {
        await respondRequest(p.id, true);
      }
      await refresh();
    } catch (e) {
      showSnack({ text: friendlyError(e) });
    } finally {
      setBusy(null);
    }
  };
  return { run, busy };
}

export const first = (p: Pick<Person, 'display_name'>) => p.display_name.split(' ')[0];

/** One button showing my status with someone (B4 People mockup): Connect · Requested · Accept · Connected. */
export function RelationButton({ person, relation, onPress, busy }: { person: Person; relation: Relation; onPress: () => void; busy?: boolean }) {
  if (relation === 'connected') return <Chip label="Connected" icon={Check} style={styles.chip} onPress={() => openPerson(person.id)} />;
  if (relation === 'blocked_by_me' || relation === 'self') return null;
  const look = relation === 'none' ? { label: 'Connect', variant: 'primary' as const }
    : relation === 'requested' ? { label: 'Requested', variant: 'outline' as const }
    : { label: 'Accept', variant: 'tonal' as const };
  return <Button label={busy ? '…' : look.label} variant={look.variant} small onPress={onPress} style={styles.btn}
    accessibilityHint={relation === 'requested' ? 'Tap to cancel the request' : undefined} />;
}

export const openPerson = (id: string) => router.push({ pathname: '/people/[userId]', params: { userId: id } });

/** A person row: 48 dp photo, name, "@username · Connected / wants to connect", and a trailing control. */
export function PersonRow({ person, relation, trailing, sub }: { person: Person; relation?: Relation; trailing?: React.ReactNode; sub?: string }) {
  const extra = relation === 'connected' ? ' · Connected' : relation === 'incoming' ? ' · wants to connect' : '';
  return (
    <Pressable onPress={() => openPerson(person.id)} pressScale={0.99} style={styles.row} accessibilityRole="button" accessibilityLabel={`${person.display_name}, @${person.username}`}>
      <Avatar name={person.display_name} uri={person.avatar_url} size={48} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyStrong" numberOfLines={1}>{person.display_name}</T>
        <T variant="meta" style={styles.sub} numberOfLines={1}>{sub ?? `@${person.username}${extra}`}</T>
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: space.gutter, minHeight: 64 },
  sub: { fontSize: 13, marginTop: 2 },
  btn: { alignSelf: 'auto', height: 36, paddingHorizontal: 16 },
  chip: { height: 30 },
});
