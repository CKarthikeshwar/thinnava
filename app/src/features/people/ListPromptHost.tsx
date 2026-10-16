import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showSnack } from '@/components';
import { AddToListsSheet } from './AddToListsSheet';
import { dismissListPrompt, pendingListPrompts } from './api';
import { first } from './components';

/**
 * Shows E5 "You and Anu are connected!" for each new connection, one at a time, the next time the app is open
 * (spec §5.1, §8). Mounted in the tabs layout. Skip or Done clears that prompt.
 */
export function ListPromptHost() {
  const qc = useQueryClient();
  const prompts = useQuery({ queryKey: ['listPrompts'], queryFn: pendingListPrompts, staleTime: 30_000 });
  const sheet = useRef<BottomSheetModal>(null);
  const person = prompts.data?.[0] ?? null;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') prompts.refetch(); });
    return () => sub.remove();
  }, []);
  useEffect(() => { if (person) setTimeout(() => sheet.current?.present(), 400); }, [person?.id]);

  return (
    <AddToListsSheet ref={sheet} person={person} current={[]} fresh onDone={async (saved) => {
      if (!person) return;
      if (!saved) await dismissListPrompt(person.id).catch(() => {});
      else showSnack({ text: `${first(person)} added to your lists` });
      qc.invalidateQueries({ queryKey: ['listPrompts'] });
      qc.invalidateQueries({ queryKey: ['myLists'] });
      qc.invalidateQueries({ queryKey: ['profilePage'] });
    }} />
  );
}
