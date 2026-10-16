import { useLocalSearchParams } from 'expo-router';
import { VisitForm } from '@/features/visits/VisitForm';

/** D2 Add visit (spec §14): /visit/new?placeId=…&date=…&acceptTagId=… (E8 "Write my review"). */
export default function NewVisit() {
  const { placeId, date, acceptTagId } = useLocalSearchParams<{ placeId: string; date?: string; acceptTagId?: string }>();
  return <VisitForm placeId={placeId} date={date} acceptTagId={acceptTagId} />;
}
