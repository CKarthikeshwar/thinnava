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
  // Wait for the fresh copy when online: the form takes its starting values once, so a stale cached copy would stick.
  // Offline the fetch pauses (not fetching), and the cached copy is used.
  if (!q.data || (q.isFetching && !q.isFetchedAfterMount)) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  return <VisitForm placeId={q.data.place_id} existing={q.data} />;
}
