import { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Lock, UsersRound, ListChecks } from 'lucide-react-native';
import { Button, Sheet, SheetOption, T } from '@/components';
import { space } from '@/theme';
import type { AudienceList } from './api';

/** Exclusivity rule (spec §8): All connections and Only me stand alone; custom lists combine. */
export function toggleAudience(sel: string[], list: AudienceList, lists: AudienceList[]): string[] {
  if (list.kind !== 'custom') return [list.id];
  const customOnly = sel.filter((id) => lists.find((l) => l.id === id)?.kind === 'custom');
  const next = customOnly.includes(list.id) ? customOnly.filter((x) => x !== list.id) : [...customOnly, list.id];
  return next.length ? next : [lists.find((l) => l.kind === 'all')!.id];
}

export function audienceSummary(sel: string[], lists: AudienceList[]): string {
  const names = lists.filter((l) => sel.includes(l.id)).map((l) => l.name);
  return names.length ? names.join(', ') : 'All connections';
}

type Props = { lists: AudienceList[]; value: string[]; onDone: (ids: string[]) => void; title?: string };

/** D4 "Who can see this?" (spec §8): All connections (default), your lists, Only me. */
export const AudienceSheet = forwardRef<BottomSheetModal, Props>(function AudienceSheet({ lists, value, onDone, title = 'Who can see this?' }, ref) {
  const [sel, setSel] = useState(value);
  useEffect(() => setSel(value), [value.join()]);
  const hint = (l: AudienceList) =>
    l.kind === 'all' ? `${l.members} ${l.members === 1 ? 'person' : 'people'} · everyone you connect with`
    : l.kind === 'only_me' ? 'An empty list, nobody else sees it'
    : `${l.members} ${l.members === 1 ? 'person' : 'people'}`;
  return (
    <Sheet ref={ref} title={title}>
      <T variant="meta" style={styles.sub}>Pick one or more lists.</T>
      {lists.map((l) => (
        <SheetOption key={l.id} icon={l.kind === 'all' ? UsersRound : l.kind === 'only_me' ? Lock : ListChecks}
          label={l.name} hint={hint(l)} selected={sel.includes(l.id)} check onPress={() => setSel(toggleAudience(sel, l, lists))} />
      ))}
      <View style={styles.done}>
        <Button label="Done" onPress={() => { onDone(sel); (ref as any)?.current?.dismiss(); }} />
      </View>
    </Sheet>
  );
});


const styles = StyleSheet.create({
  sub: { paddingHorizontal: space.sheet, marginTop: -6, marginBottom: 6 },
  done: { paddingHorizontal: space.sheet, paddingTop: 10 },
});
