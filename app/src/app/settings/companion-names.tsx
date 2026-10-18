import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { MoreVertical, Pencil, Trash2, UserRound } from 'lucide-react-native';
import { Button, Dialog, EmptyState, IconButton, ListSurface, Screen, Sheet, SheetOption, T, TopBar, showSnack } from '@/components';
import { deleteCompanionName, ENTRY_KEYS, myCompanionNameUses, renameCompanionName, type CompanionNameUse } from '@/features/visits/api';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, radii, space, MAX_FONT_SCALE } from '@/theme';

/**
 * F5 My companion names (spec §14): the private names you went with ("Mom"), with how many visits use each.
 * ⋮ Rename (updates every visit) · Delete (removed from those visits).
 */
export default function CompanionNames() {
  const qc = useQueryClient();
  const names = useQuery({ queryKey: ['companionNameUses'], queryFn: myCompanionNameUses });
  const [target, setTarget] = useState<CompanionNameUse | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sheet = useRef<BottomSheetModal>(null);

  const refresh = () => Promise.all([...ENTRY_KEYS, ['companionNameUses'], ['userVisits']].map((k) => qc.invalidateQueries({ queryKey: k })));
  const open = (n: CompanionNameUse) => { setTarget(n); setRenaming(false); setNewName(n.name); sheet.current?.present(); };
  const run = async (fn: () => Promise<unknown>, done: string) => {
    try { await fn(); await refresh(); showSnack({ text: done }); sheet.current?.dismiss(); }
    catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      showSnack({ text: msg.includes('name_taken') ? 'You already have a name like that.' : friendlyError(e) });
    }
  };
  const visits = (n: number) => `${n} ${n === 1 ? 'visit' : 'visits'}`;

  const list = names.data ?? [];
  return (
    <Screen header={<TopBar title="Companion names" onBack={() => router.back()} />} scroll={false}>
      {names.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : list.length === 0 ? (
        <View style={{ paddingTop: 20 }}>
          <EmptyState title="No companion names yet" body={'When you add who you went with ("Mom", "Appa"), the names show up here. Only you see them.'} />
        </View>
      ) : (
        <ListSurface style={styles.surface}>
          {list.map((n) => (
            <View key={n.id} style={styles.row}>
              <View style={styles.mark}><UserRound size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{n.name}</T>
                <T variant="meta" style={styles.sub}>{visits(n.visits)}</T>
              </View>
              <IconButton icon={MoreVertical} label={`Options for ${n.name}`} ghost onPress={() => open(n)} />
            </View>
          ))}
          <T variant="meta" style={styles.note}>Only you see these names, on your own visits.</T>
        </ListSurface>
      )}

      <Sheet ref={sheet} title={target ? (renaming ? `Rename ${target.name}` : target.name) : ''}>
        {target && !renaming ? (
          <>
            <SheetOption icon={Pencil} label="Rename" hint="Changes it on every visit" onPress={() => setRenaming(true)} />
            <SheetOption icon={Trash2} label="Delete" hint={target.visits ? `Removed from ${visits(target.visits)}` : undefined}
              onPress={() => { sheet.current?.dismiss(); setConfirmDelete(true); }} />
          </>
        ) : null}
        {target && renaming ? (
          <View style={styles.renameBox}>
            <View style={styles.field}>
              <BottomSheetTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} value={newName} onChangeText={(t) => setNewName(t.slice(0, 40))} autoFocus style={styles.input} autoCapitalize="words" />
            </View>
            <Button label="Save" disabled={!newName.trim() || newName.trim() === target.name} onPress={() => run(() => renameCompanionName(target.id, newName), 'Renamed')} />
          </View>
        ) : null}
      </Sheet>
      <Dialog visible={confirmDelete} icon={Trash2} destructive confirmLabel="Delete"
        title={`Delete ${target?.name ?? 'this name'}?`}
        body={target?.visits ? `It'll be removed from ${visits(target.visits)}. The visits stay.` : "This can't be undone."}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); if (target) run(() => deleteCompanionName(target.id), 'Name deleted'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, paddingLeft: space.gutter, paddingRight: 6 },
  mark: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: 13, marginTop: 1 },
  note: { paddingHorizontal: space.gutter, paddingTop: 12, fontSize: 12.5 },
  renameBox: { paddingHorizontal: space.sheet, gap: 14 },
  field: { height: 52, borderRadius: radii.field, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 2px ${colors.primary}`, justifyContent: 'center', paddingHorizontal: 16 },
  input: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, paddingVertical: 0 },
});
