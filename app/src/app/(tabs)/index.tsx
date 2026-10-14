import { StyleSheet, View } from 'react-native';
import { Bell, Lightbulb, SlidersHorizontal } from 'lucide-react-native';
import { Button, EmptyState, IconButton, Screen, T, TopBar, showSnack } from '@/components';
import { colors, radii, space } from '@/theme';

// B1 Home. M1 shows the new-user empty state (B1a); the timeline arrives in M4.
export default function Home() {
  const soon = () => showSnack({ text: 'This arrives in a later milestone.' });
  return (
    <Screen
      rings={0}
      header={
        <TopBar
          wordmark
          actions={
            <>
              <IconButton icon={Bell} label="Notifications" onPress={soon} />
              <IconButton icon={SlidersHorizontal} label="Filter" onPress={soon} />
            </>
          }
        />
      }
      contentStyle={styles.content}
    >
      <EmptyState title="Hi there! Your feed is empty." body="Start with whichever is easiest.">
        <Button label="Log a place you've been" onPress={soon} />
        <Button label="Save what a friend told you" variant="tonal" onPress={soon} />
        <Button label="Find people you know" variant="outline" onPress={soon} />
        <View style={styles.tip}>
          <Lightbulb size={20} color={colors.primary} strokeWidth={2} />
          <T variant="label" style={styles.tipText}>Tip: copy a friend's WhatsApp message, then open Thinnava</T>
        </View>
      </EmptyState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceTint, borderRadius: radii.field + 2, paddingVertical: 12, paddingHorizontal: space.md, marginTop: 4 },
  tipText: { flex: 1, fontSize: 13.5 },
});
