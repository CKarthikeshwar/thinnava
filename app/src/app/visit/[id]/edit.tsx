import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { entryDetail } from '@/features/visits/api';
import { VisitForm } from '@/features/visits/VisitForm';
import { colors } from '@/theme';

/** D2 Edit visit (spec §14): /visit/<id>/edit */
export default function EditVisit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['entry', 'visit', id], queryFn: () => entryDetail('visit', id) });
  if (!q.data) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  return <VisitForm placeId={q.data.place_id} existing={q.data} />;
}
