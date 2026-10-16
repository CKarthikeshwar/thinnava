import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, UsersRound, Utensils, type LucideProps } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Button, Panel, T, TextField, TopBar, showSnack } from '@/components';
import { deleteAccount } from '@/features/auth/api';
import { useAuth } from '@/features/auth/session';
import { myCounts } from '@/features/visits/api';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, shadows, space } from '@/theme';

const SAD = require('../../../assets/images/cat-sad.png');

/** F7 Delete account (spec §14): the one place we add friction on purpose. Typing your username enables the button. */
export default function DeleteAccount() {
  const profile = useAuth((s) => s.profile);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const counts = useQuery({ queryKey: ['myCounts'], queryFn: myCounts });
  if (!profile) return null;
  // "1 visit", "17 visits"; just "Visits" until the counts load.
  const n = (k: 'visits' | 'connections' | 'saved', one: string) => {
    if (!counts.data) return k;
    const c = counts.data[k];
    return `${c} ${c === 1 ? one : k === 'saved' ? 'friend and internet entries' : k}`;
  };
  const what: [ComponentType<LucideProps>, string][] = [
    [Utensils, `${n('visits', 'visit')} and your reviews`],
    [MessageCircle, counts.data ? n('saved', 'friend or internet entry') : 'Friend and internet entries'],
    [UsersRound, `${n('connections', 'connection')} and your lists`],
  ];
  const firstName = profile.display_name.split(' ')[0];
  const ok = typed.trim().toLowerCase() === profile.username;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar title="Delete account" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Image source={SAD} style={styles.cat} contentFit="contain" accessibilityElementsHidden />
          <T variant="title" style={styles.center}>Sad to see you go, {firstName}</T>
          <View>
            <Panel style={styles.panel}>
              {what.map(([Icon, text], i) => (
                <View key={text} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={styles.icon}><Icon size={18} color={colors.primaryStrong} strokeWidth={2} /></View>
                  <T style={styles.rowText}>{text.charAt(0).toUpperCase() + text.slice(1)}</T>
                </View>
              ))}
            </Panel>
            <T variant="body" style={styles.note}>All of this is deleted permanently. Tags on other people's visits are removed.</T>
          </View>
          <TextField label={`Type ${profile.username} to confirm`} value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} placeholder="Your username" />
          <View style={{ flexGrow: 1 }} />
          <Button
            label={busy ? 'Deleting…' : 'Delete my account'}
            disabled={!ok || busy}
            style={{ backgroundColor: colors.bad }}
            onPress={async () => {
              setBusy(true);
              try {
                await deleteAccount(); // signs out → the gate shows the intro
              } catch (e) {
                showSnack({ text: friendlyError(e, "Couldn't delete the account. Try again.") });
                setBusy(false);
              }
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flexGrow: 1, paddingHorizontal: space.gutter, paddingBottom: 24, gap: 14 },
  cat: { width: 120, height: 120 * (665 / 530), alignSelf: 'center' },
  center: { textAlign: 'center' },
  panel: { boxShadow: shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  note: { fontSize: 14, marginTop: 10 },
});
