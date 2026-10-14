import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Palette, Settings, Users } from 'lucide-react-native';
import { Avatar, Button, IconButton, Panel, Screen, T, TopBar, showSnack } from '@/components';
import { space } from '@/theme';

// B5 My profile. Real data arrives with sign-in (M2) and visits (M4).
export default function Profile() {
  const soon = () => showSnack({ text: 'This arrives in a later milestone.' });
  return (
    <Screen
      rings={2}
      header={
        <TopBar
          title="Profile"
          actions={
            <>
              <IconButton icon={Users} label="Connections" onPress={soon} />
              <IconButton icon={Settings} label="Settings" onPress={soon} />
            </>
          }
        />
      }
    >
      <View style={styles.id}>
        <Avatar name="Thinnava User" size={84} />
        <T variant="title" style={styles.center}>Your name</T>
        <T variant="meta" style={styles.center}>@username · sign-in arrives in M2</T>
      </View>
      <View style={styles.counts}>
        {[['0', 'Visited'], ['0', 'Wishlist'], ['0', 'Connections']].map(([n, l]) => (
          <Panel key={l} style={styles.count}>
            <T variant="title" style={styles.center}>{n}</T>
            <T variant="label" style={styles.center}>{l}</T>
          </Panel>
        ))}
      </View>
      {__DEV__ ? (
        <View style={styles.dev}>
          <Button label="Design gallery (dev only)" variant="tonal" icon={Palette} onPress={() => router.push('/dev/gallery')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  id: { alignItems: 'center', gap: 4, marginTop: 8 },
  center: { textAlign: 'center' },
  counts: { flexDirection: 'row', gap: 10, paddingHorizontal: space.gutter, marginTop: 18 },
  count: { flex: 1, paddingVertical: 12, borderRadius: 16 },
  dev: { paddingHorizontal: space.gutter, marginTop: 24 },
});
