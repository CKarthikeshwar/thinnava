import { useLocalSearchParams } from 'expo-router';
import { SavedScreen } from '@/features/saved/SavedScreen';

/** D5 friend / internet entry (spec §14): /saved/new?source=friend|internet&placeId=… */
export default function NewSaved() {
  const { source, placeId } = useLocalSearchParams<{ source?: 'friend' | 'internet'; placeId?: string }>();
  return <SavedScreen source={source === 'internet' ? 'internet' : 'friend'} placeId={placeId} />;
}
