import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { Avatar, Button, CheckBox, Dialog, IconButton, ListSurface, Pressable, Sheet, T, TopBar, showSnack } from '@/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteList, listDetail, myConnections, renameList, setListMembers } from '@/features/people/api';
import { PersonRow, useRefreshPeople } from '@/features/people/components';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, radii, space } from '@/theme';

/** E7 List detail (spec §8, §14): rename (pencil), remove people (×), add people, delete (falls back to Only me). */
export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useQuery({ queryKey: ['listDetail', id], queryFn: () => listDetail(id) });
  const conns = useQuery({ queryKey: ['connections'], queryFn: myConnections });
  const refresh = useRefreshPeople();
  const renameSheet = useRef<BottomSheetModal>(null);
  const addSheet = useRef<BottomSheetModal>(null);
  const [name, setName] = useState('');
  const [pick, setPick] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);

  if (!list.data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{list.isLoading ? <ActivityIndicator color={colors.primary} /> : <T variant="body">This list isn't available.</T>}</View>
      </SafeAreaView>
    );
  }
  const l = list.data;
  const members = l.members.map((m) => m.id);
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    try { await fn(); await refresh(); if (done) showSnack({ text: done }); } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      showSnack({ text: msg.includes('list_name_taken') ? 'You already have a list with that name.' : friendlyError(e) });
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar title={l.name} onBack={() => router.back()}
        actions={<IconButton icon={Pencil} label="Rename list" ghost onPress={() => { setName(l.name); renameSheet.current?.present(); }} />} />
      <ListSurface style={styles.surface}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <T style={styles.sec}>{l.members.length} {l.members.length === 1 ? 'person' : 'people'}</T>
          {l.members.map((m) => (
            <PersonRow key={m.id} person={m} trailing={
              <IconButton icon={X} ghost label={`Remove ${m.display_name} from ${l.name}`} style={{ width: 40, height: 40 }}
                onPress={() => run(() => setListMembers(l.id, members.filter((x) => x !== m.id)), `Removed from ${l.name}`)} />
            } />
          ))}
          <Pressable onPress={() => { setPick(members); addSheet.current?.present(); }} pressScale={0.99} style={styles.add} accessibilityRole="button">
            <View style={styles.addIc}><Plus size={20} color={colors.primaryStrong} strokeWidth={2.2} /></View>
            <T style={styles.addText}>Add people</T>
          </Pressable>
          <Pressable onPress={() => setConfirm(true)} style={styles.del} accessibilityRole="button">
            <Trash2 size={16} color={colors.bad} strokeWidth={2} />
            <T style={styles.delText}>Delete list</T>
          </Pressable>
        </ScrollView>
      </ListSurface>

      <Sheet ref={renameSheet} title="Rename list">
        <View style={styles.box}>
          <View style={styles.field}>
            <BottomSheetTextInput value={name} onChangeText={(t) => setName(t.slice(0, 30))} style={styles.input} autoCapitalize="words" />
          </View>
          <Button label="Save" disabled={!name.trim() || name.trim() === l.name}
            onPress={() => { renameSheet.current?.dismiss(); run(() => renameList(l.id, name), 'Renamed'); }} />
        </View>
      </Sheet>
      <Sheet ref={addSheet} title={`Add to ${l.name}`}>
        {(conns.data ?? []).length === 0 ? <T variant="body" style={{ paddingHorizontal: space.sheet }}>Connect with people first, then add them here.</T> : null}
        {(conns.data ?? []).map((c) => {
          const on = pick.includes(c.id);
          return (
            <Pressable key={c.id} onPress={() => setPick(on ? pick.filter((x) => x !== c.id) : [...pick, c.id])} pressScale={0.99} style={styles.pickRow}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={c.display_name}>
              <Avatar name={c.display_name} uri={c.avatar_url} size={40} />
              <View style={{ flex: 1 }}><T variant="bodyStrong">{c.display_name}</T><T variant="meta">@{c.username}</T></View>
              <CheckBox on={on} />
            </Pressable>
          );
        })}
        <View style={styles.box}>
          <Button label="Done" onPress={() => { addSheet.current?.dismiss(); run(() => setListMembers(l.id, pick), 'List updated'); }} />
        </View>
      </Sheet>
      <Dialog visible={confirm} icon={Trash2} destructive confirmLabel="Delete" title={`Delete ${l.name}?`}
        body={l.visits ? `Visits shared only with ${l.name} become Only me. Nobody gains access.` : 'Nobody is told. Visits shared only with this list become Only me.'}
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); run(() => deleteList(l.id), 'List deleted').then(() => router.back()); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  surface: { flex: 1, paddingTop: 4 },
  sec: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft, paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 2 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: space.gutter },
  addIc: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.bodyHeavy, fontSize: 15.5, color: colors.primary },
  del: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: space.gutter, paddingVertical: 20 },
  delText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.bad },
  box: { paddingHorizontal: space.sheet, paddingTop: 10, gap: 14 },
  field: { height: 52, borderRadius: radii.field, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 2px ${colors.primary}`, justifyContent: 'center', paddingHorizontal: 16 },
  input: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, paddingHorizontal: space.sheet },
});
