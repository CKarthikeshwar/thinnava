import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, ListSurface, Screen, T, TopBar, showSnack } from '@/components';
import { myBlocked, unblockUser } from '@/features/people/api';
import { PersonRow, useRefreshPeople } from '@/features/people/components';
import { friendlyError } from '@/lib/errors';
import { colors, space } from '@/theme';

/** Blocked people (spec §5.3, §14): a simple list with Unblock. Unblocking doesn't restore a connection. */
export default function Blocked() {
  const blocked = useQuery({ queryKey: ['blocked'], queryFn: myBlocked });
  const refresh = useRefreshPeople();
  return (
    <Screen header={<TopBar title="Blocked people" onBack={() => router.back()} />} scroll={false}>
      <ListSurface style={{ flex: 1, paddingTop: 8 }}>
        <ScrollView>
          {blocked.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: 24 }} /> : null}
          {blocked.data?.map((p) => (
            <PersonRow key={p.id} person={p} trailing={
              <Button label="Unblock" variant="outline" small style={{ alignSelf: 'auto', height: 36 }} onPress={async () => {
                try { await unblockUser(p.id); await refresh(); showSnack({ text: `${p.display_name} is unblocked` }); } catch (e) { showSnack({ text: friendlyError(e) }); }
              }} />
            } />
          ))}
          {blocked.data && !blocked.data.length ? <T variant="body" style={{ textAlign: 'center', padding: 28 }}>You haven't blocked anyone.</T> : null}
          <View style={{ height: 8 }} />
          <T variant="meta" style={{ paddingHorizontal: space.gutter, fontSize: 12.5 }}>Unblocking doesn't reconnect you. They can find you and ask to connect again.</T>
        </ScrollView>
      </ListSurface>
    </Screen>
  );
}
