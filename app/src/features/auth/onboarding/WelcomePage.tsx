import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { MessageCircle, UsersRound, Utensils } from 'lucide-react-native';
import { Button, CatPeek, Dots, GoogleMark, T, showSnack } from '@/components';
import { signInWithGoogle } from '@/features/auth/api';
import { LEGAL } from '@/lib/links';
import { colors, radii } from '@/theme';

/** A2 Welcome (spec §14): the promise and Continue with Google. The auth gate routes on after sign-in. */
export function WelcomePage() {
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.warn('Google sign-in failed', e);
      showSnack({ text: "Couldn't sign in. Try again." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.page}>
      <T variant="display" style={styles.word}>Thinnava</T>
      <View style={{ marginTop: 14 }}><Dots count={3} active={2} /></View>
      <View style={{ flex: 1 }} />
      <CatPeek width={230} />
      <View style={styles.card}>
        <T variant="headline" color={colors.onPrimary}>Every place your friends rave about, in one spot.</T>
        <View style={styles.vals}>
          {[
            [MessageCircle, 'Save what friends tell you'],
            [Utensils, 'Log where you ate'],
            [UsersRound, 'See where your people have been'],
          ].map(([Icon, text]: any) => (
            <View key={text} style={styles.val}>
              <View style={styles.valIcon}><Icon size={18} color={colors.onPrimary} strokeWidth={2} /></View>
              <T style={styles.valText} color={colors.onPrimary}>{text}</T>
            </View>
          ))}
        </View>
        <Button label={busy ? 'Signing in…' : 'Continue with Google'} variant="white" leading={<GoogleMark />} disabled={busy} onPress={signIn} style={{ marginTop: 4 }} />
        <T variant="meta" style={styles.legal} color="rgba(255,255,255,0.7)">
          By continuing you agree to the{' '}
          <T variant="meta" color="#FFFFFF" style={styles.link} onPress={() => Linking.openURL(LEGAL.terms)}>Terms</T>
          {' '}and{' '}
          <T variant="meta" color="#FFFFFF" style={styles.link} onPress={() => Linking.openURL(LEGAL.privacy)}>Privacy Policy</T>.
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingBottom: 12 },
  word: { textAlign: 'center', marginTop: 26 },
  card: { marginHorizontal: 12, backgroundColor: colors.primaryStrong, borderRadius: radii.hero, paddingTop: 38, paddingHorizontal: 22, paddingBottom: 20, gap: 16 },
  vals: { gap: 12 },
  val: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  valText: { fontFamily: 'Nunito_700Bold', fontSize: 15.5 },
  legal: { textAlign: 'center', fontSize: 11.5 },
  link: { textDecorationLine: 'underline', fontSize: 11.5 },
});
