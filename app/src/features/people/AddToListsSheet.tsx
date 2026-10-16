import { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, Plus, UsersRound } from 'lucide-react-native';
import { Avatar, Button, CheckBox, Pressable, Sheet, T, showSnack } from '@/components';
import { myLists } from '@/features/visits/api';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, space } from '@/theme';
import { addToLists, type Person } from './api';
import { first } from './components';

type Props = {
  person: Person | null;
  /** Lists they're already in (E1); empty for a new connection (E5, nothing ticked). */
  current: string[];
  /** true for the E5 "You and Anu are connected!" version. */
  fresh?: boolean;
  onDone: (saved: boolean) => void;
};

/** E5 Add to lists (spec §8, §14): All connections is ticked and disabled ("Automatic"); custom lists are tickboxes. */
export const AddToListsSheet = forwardRef<BottomSheetModal, Props>(function AddToListsSheet({ person, current, fresh, onDone }, ref) {
  const lists = useQuery({ queryKey: ['myLists'], queryFn: myLists });
  const [sel, setSel] = useState<string[]>(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSel(current), [person?.id, current.join()]);
  const custom = (lists.data ?? []).filter((l) => l.kind === 'custom');
  const close = () => (ref as any)?.current?.dismiss();

  const save = async () => {
    if (!person) return;
    setBusy(true);
    try {
      await addToLists(person.id, sel);
      onDone(true);
      close();
    } catch (e) { showSnack({ text: friendlyError(e) }); }
    setBusy(false);
  };
  const newList = () => { onDone(false); close(); router.push({ pathname: '/lists', params: { create: '1' } } as unknown as Href); };

  if (!person) return <Sheet ref={ref}><View /></Sheet>;
  return (
    <Sheet ref={ref} onDismiss={() => onDone(false)}>
      <View style={styles.head}>
        <Avatar name={person.display_name} uri={person.avatar_url} size={40} />
        <T variant="title" style={{ fontSize: 18, flex: 1 }}>{fresh ? `You and ${first(person)} are connected!` : `${first(person)}'s lists`}</T>
      </View>
      <T variant="meta" style={styles.sub}>Add {first(person)} to any of your lists?</T>
      <View style={styles.row}>
        <View style={styles.mark}><UsersRound size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
        <View style={{ flex: 1 }}><T variant="bodyStrong">All connections</T><T variant="meta" style={styles.hint}>Automatic</T></View>
        <View style={{ opacity: 0.5 }}><CheckBox on /></View>
      </View>
      {custom.map((l) => {
        const on = sel.includes(l.id);
        return (
          <Pressable key={l.id} onPress={() => setSel(on ? sel.filter((x) => x !== l.id) : [...sel, l.id])} pressScale={0.99} style={styles.row}
            accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={l.name}>
            <View style={styles.mark}><ListChecks size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
            <T variant="bodyStrong" style={{ flex: 1 }}>{l.name}</T>
            <CheckBox on={on} />
          </Pressable>
        );
      })}
      {!custom.length ? (
        <Pressable onPress={newList} pressScale={0.99} style={styles.row} accessibilityRole="button">
          <View style={styles.mark}><Plus size={20} color={colors.primary} strokeWidth={2.2} /></View>
          <View style={{ flex: 1 }}>
            <T style={styles.create}>Create a list</T>
            <T variant="meta" style={styles.hint}>Like "Close friends" or "College"</T>
          </View>
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        <Button label="Skip" variant="outline" onPress={() => { onDone(false); close(); }} style={{ flex: 1 }} />
        <Button label={busy ? 'Saving…' : 'Done'} onPress={save} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.sheet, paddingBottom: 4 },
  sub: { paddingHorizontal: space.sheet, paddingBottom: 8, fontSize: 13.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: space.sheet },
  mark: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 13, marginTop: 1 },
  create: { fontFamily: fonts.bodyHeavy, fontSize: 15.5, color: colors.primary },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12 },
});
