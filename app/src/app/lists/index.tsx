import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ChevronRight, ListChecks, Lock, Plus, UsersRound } from 'lucide-react-native';
import { Button, Panel, Pressable, Screen, Sheet, T, TopBar, showSnack } from '@/components';
import { createList } from '@/features/people/api';
import { useRefreshPeople } from '@/features/people/components';
import { myLists } from '@/features/visits/api';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, radii, shadows, space, MAX_FONT_SCALE } from '@/theme';

/** E6 My lists (spec §8, §14): All connections (count, automatic), custom lists, Only me, + New list. Max 20 custom lists. */
export default function MyLists() {
  const params = useLocalSearchParams<{ create?: string }>();
  const lists = useQuery({ queryKey: ['myLists'], queryFn: myLists });
  const sheet = useRef<BottomSheetModal>(null);
  const [name, setName] = useState('');
  const refresh = useRefreshPeople();
  useEffect(() => { if (params.create) setTimeout(() => sheet.current?.present(), 300); }, [params.create]);

  const all = (lists.data ?? []).find((l) => l.kind === 'all');
  const custom = (lists.data ?? []).filter((l) => l.kind === 'custom');
  const create = async () => {
    try {
      const id = await createList(name);
      setName('');
      sheet.current?.dismiss();
      await refresh();
      router.push({ pathname: '/lists/[id]', params: { id } });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      showSnack({ text: msg.includes('list_name_taken') ? 'You already have a list with that name.' : msg.includes('too_many_lists') ? 'You can have up to 20 lists.' : friendlyError(e) });
    }
  };

  return (
    <Screen header={<TopBar title="My lists" onBack={() => router.back()} />} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}>
        <Panel style={styles.group}>
          <Row icon={UsersRound} title="All connections" sub={`${all?.members ?? 0} ${all?.members === 1 ? 'person' : 'people'} · automatic`} />
          {custom.map((l) => (
            <Row key={l.id} icon={ListChecks} title={l.name} sub={`${l.members} ${l.members === 1 ? 'person' : 'people'}`}
              onPress={() => router.push({ pathname: '/lists/[id]', params: { id: l.id } })} />
          ))}
          <Row icon={Lock} title="Only me" sub="Empty list · just you" />
        </Panel>
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <Button label="New list" icon={Plus} variant="tonal" onPress={() => sheet.current?.present()} />
        </View>
        <T variant="meta" style={styles.note}>Lists are private. People never see which of your lists they're in.</T>
      </ScrollView>
      <Sheet ref={sheet} title="New list">
        <View style={styles.newBox}>
          <View style={styles.field}>
            <BottomSheetTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} value={name} onChangeText={(t) => setName(t.slice(0, 30))} placeholder="Close friends, College, Office…" placeholderTextColor={colors.inkMuted}
              style={styles.input} autoCapitalize="words" returnKeyType="done" onSubmitEditing={() => name.trim() && create()} />
          </View>
          <Button label="Create list" disabled={!name.trim()} onPress={create} />
        </View>
      </Sheet>
    </Screen>
  );
}

function Row({ icon: Icon, title, sub, onPress }: { icon: typeof UsersRound; title: string; sub: string; onPress?: () => void }) {
  const body = (
    <>
      <View style={styles.ic}><Icon size={18} color={colors.primaryStrong} strokeWidth={2} /></View>
      <View style={{ flex: 1 }}>
        <T style={styles.title}>{title}</T>
        <T variant="meta" style={{ fontSize: 12.5 }}>{sub}</T>
      </View>
      {onPress ? <ChevronRight size={18} color={colors.inkMuted} strokeWidth={2} /> : null}
    </>
  );
  return onPress
    ? <Pressable onPress={onPress} pressScale={0.99} style={styles.row} accessibilityRole="button" accessibilityLabel={`${title}, ${sub}`}>{body}</Pressable>
    : <View style={styles.row}>{body}</View>;
}

const styles = StyleSheet.create({
  group: { marginHorizontal: 16, marginBottom: 12, borderRadius: 22, boxShadow: shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.hairline, marginTop: -1 },
  ic: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  note: { paddingHorizontal: space.gutter, paddingTop: 14, fontSize: 12.5 },
  newBox: { paddingHorizontal: space.sheet, gap: 14 },
  field: { height: 52, borderRadius: radii.field, backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 2px ${colors.primary}`, justifyContent: 'center', paddingHorizontal: 16 },
  input: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, paddingVertical: 0 },
});
