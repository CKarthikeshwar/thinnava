import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ClipboardPaste, Heart, Smartphone, ThumbsDown } from 'lucide-react-native';
import { Pressable, ReviewPill, RingsGround, T, showSnack, GoogleMark } from '@/components';
import { signInWithGoogle } from '@/features/auth/api';
import { LEGAL } from '@/lib/links';
import { useLayoutMode } from '@/lib/layout';
import { colors, fonts, radii, shadows } from '@/theme';

const ICON = require('../../../assets/icon.png');
const CAT = require('../../../assets/images/cat-offering.png');

/**
 * Signed-out front page on the web (spec §18.3, design/web.html): one promise, one example (a friend's message turning
 * into a saved place) and one button. Newcomers continue to A3; Android users land on Home with all their places.
 */
export function FrontPage() {
  const laptop = useLayoutMode() === 'laptop';
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true);
    try { await signInWithGoogle(); } catch (e) {
      console.warn('Google sign-in failed', e);
      showSnack({ text: "Couldn't sign in. Try again." });
      setBusy(false);
    }
  };

  const google = (
    <Pressable onPress={signIn} disabled={busy} pressScale={0.98} style={[styles.google, !laptop && styles.googleSmall]} accessibilityRole="button" accessibilityLabel="Continue with Google">
      <GoogleMark />
      <T style={styles.googleText}>{busy ? 'Signing in…' : 'Continue with Google'}</T>
    </Pressable>
  );
  const legal = (
    <T style={[styles.fine, !laptop && { textAlign: 'center' }]}>
      By continuing you agree to the{' '}
      <T style={[styles.fine, styles.u]} onPress={() => Linking.openURL(LEGAL.terms)}>Terms</T> and{' '}
      <T style={[styles.fine, styles.u]} onPress={() => Linking.openURL(LEGAL.privacy)}>Privacy Policy</T>.
    </T>
  );
  const android = (
    <View style={[styles.back, !laptop && { alignSelf: 'stretch' }]}>
      <Smartphone size={17} color={colors.inkSoft} strokeWidth={2} />
      <T style={styles.backText}>Already use Thinnava on Android? Same Google account, same places.</T>
    </View>
  );
  const bubble = (
    <View style={[styles.bubble, laptop && styles.bubbleWide]}>
      <T style={styles.bubbleWho}>Rahul</T>
      <T style={styles.bubbleText}>da try Brik Oven in Indiranagar, the truffle mushroom pizza is insane 🍕 bit pricey tho</T>
    </View>
  );
  const made = (
    <View style={[styles.made, laptop && styles.madeWide]}>
      <T variant="meta">Rahul told you</T>
      <T style={styles.madePlace}>Brik Oven</T>
      <T variant="meta">Indiranagar · Pizza</T>
      <View style={styles.madeLine}><Heart size={15} color={colors.inkSoft} strokeWidth={2} /><T variant="card">Truffle mushroom pizza</T></View>
      <View style={styles.madeLine}><ThumbsDown size={15} color={colors.inkSoft} strokeWidth={2} /><T variant="card">Bit pricey</T></View>
      <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><ReviewPill rating="good" /></View>
    </View>
  );
  const three = [
    ['Save what friends tell you', 'Copy their message and paste it. We fill in the place.'],
    ['Log where you ate', "A rating, what was good, what wasn't. Seconds."],
    ['See where your people went', "Only people you've connected with. On a list or a map."],
  ];

  return (
    <View style={styles.root}>
      <RingsGround variant={2} />
      <ScrollView contentContainerStyle={[styles.scroll, laptop && styles.scrollWide]}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <Image source={ICON} style={styles.logo} contentFit="cover" />
            <T variant="wordmark">Thinnava</T>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={signIn} pressScale={0.97} style={styles.signIn} accessibilityRole="button" accessibilityLabel="Sign in with Google">
            <T style={styles.signInText}>Sign in</T>
          </Pressable>
        </View>

        {laptop ? (
          <View style={styles.hero}>
            <View style={{ flex: 1, maxWidth: 600 }}>
              <T style={styles.h1}>Every place your friends rave about, <T style={[styles.h1, { color: colors.primary }]}>in one spot.</T></T>
              <T style={styles.lead}>No more scrolling chats to find "that biryani place Rahul said". Save what friends tell you, log where you ate, and see where your people have been. No strangers, no ads.</T>
              <View style={{ alignSelf: 'flex-start' }}>{google}</View>
              <View style={{ marginTop: 12 }}>{legal}</View>
              <View style={{ marginTop: 22 }}>{android}</View>
            </View>
            <View style={styles.stage}>
              {bubble}
              <View style={[styles.flow, styles.flowWide]}><ClipboardPaste size={17} color={colors.primary} strokeWidth={2.2} /><T style={styles.flowText}>Paste it into Thinnava</T></View>
              {made}
              <Image source={CAT} style={styles.cat} contentFit="contain" />
            </View>
          </View>
        ) : (
          <View style={styles.stack}>
            <Image source={CAT} style={styles.catSmall} contentFit="contain" />
            <T style={[styles.h1, styles.h1Small]}>Every place your friends rave about, <T style={[styles.h1, styles.h1Small, { color: colors.primary }]}>in one spot.</T></T>
            <T style={[styles.lead, styles.leadSmall]}>Save what friends tell you, log where you ate, see where your people have been.</T>
            {google}
            {legal}
            {android}
            {bubble}
            <View style={[styles.flow, { alignSelf: 'center' }]}><ClipboardPaste size={17} color={colors.primary} strokeWidth={2.2} /><T style={styles.flowText}>Paste it into Thinnava</T></View>
            {made}
          </View>
        )}

        <View style={[styles.three, !laptop && styles.threeSmall]}>
          {three.map(([h, b]) => (
            <View key={h} style={[styles.threeBox, laptop && { flex: 1 }]}>
              <T style={styles.threeH}>{h}</T>
              <T variant="card">{b}</T>
            </View>
          ))}
        </View>

        <View style={styles.foot}>
          <T style={styles.footLink} onPress={() => Linking.openURL(LEGAL.privacy)}>Privacy</T>
          <T style={styles.footLink} onPress={() => Linking.openURL(LEGAL.terms)}>Terms</T>
          <View style={{ flex: 1 }} />
          <T style={styles.footText}>Made in Bengaluru</T>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  scrollWide: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 56 },
  top: { height: 72, flexDirection: 'row', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 32, height: 32, borderRadius: 10 },
  signIn: { height: 40, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1.5px ${colors.hairline}` },
  signInText: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.ink },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 40, paddingLeft: 40, marginTop: 24 },
  h1: { fontFamily: fonts.display, fontSize: 54, lineHeight: 60, color: colors.ink, marginBottom: 18 },
  h1Small: { fontSize: 31, lineHeight: 35, textAlign: 'center', marginBottom: 0 },
  lead: { fontFamily: fonts.body, fontSize: 19, lineHeight: 29, color: colors.inkSoft, marginBottom: 28 },
  leadSmall: { fontSize: 15.5, lineHeight: 23, textAlign: 'center', marginBottom: 0 },
  google: { height: 56, paddingHorizontal: 26, borderRadius: 16, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleSmall: { height: 52, justifyContent: 'center' },
  googleText: { fontFamily: fonts.bodyHeavy, fontSize: 17, color: colors.onPrimary },
  fine: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkMuted },
  u: { textDecorationLine: 'underline', color: colors.inkSoft },
  back: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  backText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft, flexShrink: 1 },
  stage: { width: 540, height: 480 },
  bubble: { backgroundColor: colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, paddingVertical: 12, paddingHorizontal: 14, boxShadow: shadows.panel },
  bubbleWide: { position: 'absolute', left: 0, top: 20, width: 330 },
  bubbleWho: { fontFamily: fonts.bodyHeavy, fontSize: 12.5, color: colors.chatName, marginBottom: 2 },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flowWide: { position: 'absolute', left: 150, top: 150 },
  flowText: { fontFamily: fonts.display, fontSize: 16, color: colors.primary },
  made: { backgroundColor: colors.surface, borderRadius: radii.card + 2, padding: 16, boxShadow: shadows.panel },
  madeWide: { position: 'absolute', left: 150, top: 190, width: 340 },
  madePlace: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 2 },
  madeLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  cat: { position: 'absolute', right: 0, bottom: 0, width: 190, height: 230 },
  stack: { gap: 16, alignItems: 'stretch', marginTop: 4 },
  catSmall: { width: 130, height: 150, alignSelf: 'center' },
  three: { flexDirection: 'row', gap: 16, marginTop: 30, paddingLeft: 40 },
  threeSmall: { flexDirection: 'column', paddingLeft: 0, gap: 10 },
  threeBox: { backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
  threeH: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  foot: { flexDirection: 'row', gap: 22, marginTop: 'auto', paddingTop: 36, paddingLeft: 40 },
  footLink: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkMuted },
  footText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkMuted },
});
