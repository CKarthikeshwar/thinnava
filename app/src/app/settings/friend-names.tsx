import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { GitMerge, Link2, MoreVertical, Pencil, Trash2, UserRound } from 'lucide-react-native';
import { Avatar, Button, Dialog, EmptyState, IconButton, ListSurface, Pressable, Screen, Sheet, SheetOption, T, TopBar, showSnack } from '@/components';
import { deleteFriendName, mergeFriendNames, myFriendNames, renameFriendName, SAVED_KEYS, type FriendName } from '@/features/saved/api';
import { linkFriendName, myConnections } from '@/features/people/api';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, radii, space, MAX_FONT_SCALE } from '@/theme';

/**
 * F4 My friend names (spec §14): entry counts; ⋮ per name: Rename · Merge into… · Link to a connection / Unlink · Delete
 * (only when unused). No automatic merge suggestions.
 */
export default function FriendNames() {
  const qc = useQueryClient();
  const names = useQuery({ queryKey: ['friendNames'], queryFn: myFriendNames });
  const conns = useQuery({ queryKey: ['connections'], queryFn: myConnections });
  const [target, setTarget] = useState<FriendName | null>(null);
  const [mode, setMode] = useState<'menu' | 'rename' | 'merge' | 'link'>('menu');
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sheet = useRef<BottomSheetModal>(null);

  const refresh = () => Promise.all(SAVED_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
  const open = (n: FriendName) => { setTarget(n); setMode('menu'); setNewName(n.name); sheet.current?.present(); };
  const close = () => sheet.current?.dismiss();
  const run = async (fn: () => Promise<unknown>, done: string) => {
    try { await fn(); await refresh(); showSnack({ text: done }); close(); }
    catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      showSnack({ text: msg.includes('name_taken') ? 'You already have a name like that. Merge them instead.' : friendlyError(e) });
    }
  };

  const list = names.data ?? [];
  return (
    <Screen header={<TopBar title="Friend names" onBack={() => router.back()} />} scroll={false}>
      {names.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : list.length === 0 ? (
        <View style={{ paddingTop: 20 }}>
          <EmptyState title="No friend names yet" body="When you save what a friend told you, their name shows up here. Only you see these names." />
        </View>
      ) : (
        <ListSurface style={styles.surface}>
          {list.map((n) => (
            <View key={n.id} style={styles.row}>
              {n.linked_username ? <Avatar name={n.name} size={40} /> : <View style={styles.mark}><UserRound size={20} color={colors.primaryStrong} strokeWidth={2} /></View>}
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{n.name}</T>
                <T variant="meta" style={styles.sub}>{n.linked_username ? `Linked to @${n.linked_username} · ` : ''}{n.entries} {n.entries === 1 ? 'entry' : 'entries'}</T>
              </View>
              <IconButton icon={MoreVertical} label={`Options for ${n.name}`} ghost onPress={() => open(n)} />
            </View>
          ))}
          <T variant="meta" style={styles.note}>⋮ to rename, merge into another name, link to a connection, or delete. Only you see these names and links; entries stay private either way.</T>
        </ListSurface>
      )}

      <Sheet ref={sheet} title={target ? (mode === 'rename' ? `Rename ${target.name}` : mode === 'merge' ? `Merge ${target.name} into…` : mode === 'link' ? `Link ${target.name} to…` : target.name) : ''}>
        {target && mode === 'menu' ? (
          <>
            <SheetOption icon={Pencil} label="Rename" onPress={() => setMode('rename')} />
            <SheetOption icon={GitMerge} label="Merge into…" hint="Move its entries to another name" onPress={() => setMode('merge')} />
            {target.linked_username
              ? <SheetOption icon={Link2} label="Unlink" hint={`Linked to @${target.linked_username}`} onPress={() => run(() => linkFriendName(target.id, null), 'Unlinked')} />
              : <SheetOption icon={Link2} label="Link to a connection" hint="Only you see the link" onPress={() => setMode('link')} />}
            <SheetOption icon={Trash2} label="Delete" hint={target.entries ? 'Only names with no entries can be deleted' : undefined}
              onPress={() => { if (target.entries) return showSnack({ text: 'Merge it into another name first, or delete its entries.' }); close(); setConfirmDelete(true); }} />
          </>
        ) : null}
        {target && mode === 'rename' ? (
          <View style={styles.renameBox}>
            <View style={styles.field}>
              <BottomSheetTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} value={newName} onChangeText={(t) => setNewName(t.slice(0, 40))} autoFocus style={styles.input} autoCapitalize="words" />
            </View>
            <Button label="Save" disabled={!newName.trim() || newName.trim() === target.name} onPress={() => run(() => renameFriendName(target.id, newName), 'Renamed')} />
          </View>
        ) : null}
        {target && mode === 'link' ? (
          (conns.data ?? []).length ? (conns.data ?? []).map((c) => (
            <Pressable key={c.id} onPress={() => run(() => linkFriendName(target.id, c.id), `Linked to @${c.username}`)} pressScale={0.99} style={styles.mergeRow} accessibilityRole="button">
              <Avatar name={c.display_name} uri={c.avatar_url} size={40} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{c.display_name}</T>
                <T variant="meta" style={styles.sub}>@{c.username}</T>
              </View>
            </Pressable>
          )) : <T variant="body" style={{ paddingHorizontal: space.sheet }}>Connect with {target.name} first, then link this name to them.</T>
        ) : null}
        {target && mode === 'merge' ? (
          list.filter((n) => n.id !== target.id).map((n) => (
            <Pressable key={n.id} onPress={() => run(() => mergeFriendNames(target.id, n.id), `Merged into ${n.name}`)} pressScale={0.99} style={styles.mergeRow} accessibilityRole="button">
              <View style={styles.mark}><UserRound size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{n.name}</T>
                <T variant="meta" style={styles.sub}>{n.entries} {n.entries === 1 ? 'entry' : 'entries'}</T>
              </View>
            </Pressable>
          ))
        ) : null}
      </Sheet>
      <Dialog visible={confirmDelete} icon={Trash2} title={`Delete ${target?.name ?? 'this name'}?`} body="This can't be undone." confirmLabel="Delete" destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); if (target) run(() => deleteFriendName(target.id), 'Name deleted'); }} />
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
  mergeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: space.sheet },
});
