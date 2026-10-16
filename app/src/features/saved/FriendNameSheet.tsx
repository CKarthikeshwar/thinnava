import { forwardRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { randomUUID } from 'expo-crypto';
import { Plus, UserRound } from 'lucide-react-native';
import { Avatar, Pressable, Sheet, T } from '@/components';
import { colors, fonts, radii, space } from '@/theme';
import type { FriendName } from './api';

/** The chosen friend name. `isNew` names are created when the entry is saved (offline-safe, client id). */
export type PickedFriend = { id: string; name: string; isNew: boolean };

type Props = { names: FriendName[]; onPick: (f: PickedFriend) => void };

/** D6 "Who told you?" (spec §14): autocompletes from my private friend names; a new name is one tap. */
export const FriendNameSheet = forwardRef<BottomSheetModal, Props>(function FriendNameSheet({ names, onPick }, ref) {
  const [text, setText] = useState('');
  const q = text.trim().replace(/\s+/g, ' ');
  const shown = names.filter((n) => !q || n.name.toLowerCase().includes(q.toLowerCase()));
  const exact = names.find((n) => n.name.toLowerCase() === q.toLowerCase());
  const done = (f: PickedFriend) => { onPick(f); setText(''); (ref as any)?.current?.dismiss(); };

  return (
    <Sheet ref={ref} title="Who told you?">
      <View style={styles.field}>
        <BottomSheetTextInput value={text} onChangeText={(t) => setText(t.slice(0, 40))} placeholder="Type a name" placeholderTextColor={colors.inkMuted}
          style={styles.input} autoCapitalize="words" returnKeyType="done"
          onSubmitEditing={() => { if (exact) done({ id: exact.id, name: exact.name, isNew: false }); else if (q) done({ id: randomUUID(), name: q, isNew: true }); }} />
      </View>
      {shown.length ? <T style={styles.sec}>Your names</T> : null}
      {shown.slice(0, 6).map((n) => (
        <Pressable key={n.id} onPress={() => done({ id: n.id, name: n.name, isNew: false })} pressScale={0.99} style={styles.row}
          accessibilityRole="button" accessibilityLabel={`${n.name}, ${n.entries} entries`}>
          {n.linked_username ? <Avatar name={n.name} size={40} /> : <View style={styles.mark}><UserRound size={20} color={colors.primaryStrong} strokeWidth={2} /></View>}
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{n.name}</T>
            <T variant="meta" style={styles.sub}>
              {n.linked_username ? `Linked to @${n.linked_username} · ` : ''}{n.entries} {n.entries === 1 ? 'entry' : 'entries'}
            </T>
          </View>
        </Pressable>
      ))}
      {q && !exact ? (
        <Pressable onPress={() => done({ id: randomUUID(), name: q, isNew: true })} pressScale={0.99} style={styles.row} accessibilityRole="button">
          <View style={styles.mark}><Plus size={20} color={colors.primary} strokeWidth={2.2} /></View>
          <T style={styles.add}>Add "{q}" as a new name</T>
        </Pressable>
      ) : null}
      <T variant="meta" style={styles.note}>Names are private to you. Link one to a connection from Settings → Friend names.</T>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  field: { marginHorizontal: space.sheet, height: 52, borderRadius: radii.field, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 2px ${colors.primary}`, justifyContent: 'center', paddingHorizontal: 16 },
  input: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  sec: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft, paddingHorizontal: space.sheet, paddingTop: 16, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: space.sheet },
  mark: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: 13, marginTop: 1 },
  add: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 15.5, color: colors.primary },
  note: { paddingHorizontal: space.sheet, paddingTop: 10, fontSize: 12.5 },
});
