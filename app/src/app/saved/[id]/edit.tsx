import { useLocalSearchParams } from 'expo-router';
import { SavedScreen } from '@/features/saved/SavedScreen';

/** D5 edit a friend / internet entry (spec §14): /saved/[id]/edit */
export default function EditSaved() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SavedScreen editId={id} />;
}
