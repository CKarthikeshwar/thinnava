import { forwardRef, useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Check, Plus, Search, UserRound } from 'lucide-react-native';
import { Avatar, Button, Pressable, Sheet, T } from '@/components';
import { colors, fonts, radii, shadows, space } from '@/theme';
import type { CompanionName } from './api';

/** ids / newNames = private companion names; tags = connections to tag (they get a request, §7). */
export type Companions = { ids: string[]; newNames: string[]; tags: string[] };

type Props = { names: CompanionName[]; connections: { id: string; display_name: string; username: string; avatar_url: string | null }[]; value: Companions; onDone: (v: Companions) => void };

/**
 * D3 "Who did you go with?" (spec §7, §14): connections (tagged; they're asked to confirm) and private names
 * ("Mom", visible only to you).
 */
export const CompanionSheet = forwardRef<BottomSheetModal, Props>(function CompanionSheet({ names, connections, value, onDone }, ref) {
  const [sel, setSel] = useState(value);
  const [text, setText] = useState('');
  const input = useRef<TextInput>(null);
  useEffect(() => setSel(value), [value.ids.join(), value.newNames.join(), value.tags.join()]);
  const q = text.trim();
  const shown = names.filter((n) => !q || n.name.toLowerCase().includes(q.toLowerCase()));
  const exists = q && (names.some((n) => n.name.toLowerCase() === q.toLowerCase()) || sel.newNames.some((n) => n.toLowerCase() === q.toLowerCase()));
  const count = sel.ids.length + sel.newNames.length + sel.tags.length;
  const conns = connections.filter((c) => !q || `${c.display_name} ${c.username}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setSel({ ...sel, ids: sel.ids.includes(id) ? sel.ids.filter((x) => x !== id) : [...sel.ids, id] });

  return (
    <Sheet ref={ref} title="Who did you go with?">
      <View style={styles.searchBox}>
        <Search size={20} color={colors.inkSoft} strokeWidth={2} />
        <BottomSheetTextInput ref={input as any} value={text} onChangeText={(t) => setText(t.slice(0, 40))} placeholder="Search" placeholderTextColor={colors.inkMuted} style={styles.input} />
      </View>
      <Label strong="Connections" rest="they'll be asked to confirm" />
      {conns.slice(0, 8).map((c) => (
        <Row key={c.id} label={c.display_name} sub={`@${c.username}`} avatar={<Avatar name={c.display_name} uri={c.avatar_url} size={40} />}
          on={sel.tags.includes(c.id)} onPress={() => setSel({ ...sel, tags: sel.tags.includes(c.id) ? sel.tags.filter((x) => x !== c.id) : [...sel.tags, c.id] })} />
      ))}
      {!connections.length ? <T variant="meta" style={styles.note}>Connect with people to tag them here.</T> : null}
      <Label strong="Private names" rest="only you see these" />
      {shown.map((n) => (
        <Row key={n.id} label={n.name} on={sel.ids.includes(n.id)} onPress={() => toggle(n.id)} />
      ))}
      {sel.newNames.map((n) => (
        <Row key={'new' + n} label={n} on onPress={() => setSel({ ...sel, newNames: sel.newNames.filter((x) => x !== n) })} />
      ))}
      {!exists ? (
        <Pressable style={styles.add} accessibilityRole="button"
          onPress={() => { if (!q) { input.current?.focus(); return; } setSel({ ...sel, newNames: [...sel.newNames, q] }); setText(''); }}>
          <View style={styles.av}><Plus size={20} color={colors.primary} strokeWidth={2.2} /></View>
          <T style={styles.addText}>{q ? `Add "${q}" as a private name` : 'Add a private name'}</T>
        </Pressable>
      ) : null}
      <View style={styles.done}>
        <Button label={count ? `Done · ${count} ${count === 1 ? 'person' : 'people'}` : 'Done'} onPress={() => { onDone(sel); (ref as any)?.current?.dismiss(); }} />
      </View>
    </Sheet>
  );
});

/** Section label as in the D3 mockup: bold group name, lighter explanation. */
function Label({ strong, rest }: { strong: string; rest: string }) {
  return <T style={styles.label}><T style={[styles.label, styles.labelStrong]}>{strong}</T> · {rest}</T>;
}

function Row({ label, sub, avatar, on, onPress }: { label: string; sub?: string; avatar?: React.ReactNode; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} pressScale={0.99} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      {avatar ?? <View style={styles.av}><UserRound size={20} color={colors.primaryStrong} strokeWidth={2} /></View>}
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{label}</T>
        {sub ? <T variant="meta">{sub}</T> : null}
      </View>
      <View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBox: { marginHorizontal: space.sheet, marginBottom: 6, height: 48, borderRadius: radii.pill, backgroundColor: colors.surface, boxShadow: shadows.card, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15.5, color: colors.ink, paddingVertical: 0 },
  note: { paddingHorizontal: space.sheet, paddingBottom: 4 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkMuted, paddingHorizontal: space.sheet, paddingTop: 14, paddingBottom: 4 },
  labelStrong: { fontFamily: fonts.bodyHeavy, color: colors.inkSoft, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: space.sheet },
  av: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 7, boxShadow: `inset 0px 0px 0px 2px ${colors.inkMuted}`, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, boxShadow: 'none' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: space.sheet },
  addText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.primary },
  done: { paddingHorizontal: space.sheet, paddingTop: 10 },
});
