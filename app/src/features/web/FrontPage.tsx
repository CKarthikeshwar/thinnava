import { useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { ClipboardPaste, Download, Heart, Lock, Monitor, ThumbsDown, Users, Wallet } from 'lucide-react-native';
import { Pressable, ReviewPill, RingsGround, T, showSnack, GoogleMark } from '@/components';
import { signInWithGoogle } from '@/features/auth/api';
import { APK_URL, APK_VERSION, LEGAL } from '@/lib/links';
import { useLayoutMode } from '@/lib/layout';
import { colors, fonts, radii, shadows } from '@/theme';

const ICON = require('../../../assets/images/mark.png');
const CAT = require('../../../assets/images/cat-offering.png');

type Anchor = 'how' | 'download' | 'web';

/**
 * Signed-out home page on the web (spec §18.3, design/website-draft.html): the promise, an example, how it works,
 * the Android download with install steps, and one card for browser users ("Continue with Google"). It is the
 * site's front door; there is no separate welcome page on the web.
 */
export function FrontPage() {
  const laptop = useLayoutMode() === 'laptop';
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const [ys, setYs] = useState<Partial<Record<Anchor, number>>>({});
  const mark = (a: Anchor) => (e: LayoutChangeEvent) => { const y = e.nativeEvent.layout.y; setYs((p) => ({ ...p, [a]: y })); };
  const go = (a: Anchor) => scroll.current?.scrollTo({ y: Math.max(0, (ys[a] ?? 0) - 12), animated: true });

  const signIn = async () => {
    setBusy(true);
    try { await signInWithGoogle(); } catch (e) {
      console.warn('Google sign-in failed', e);
      showSnack({ text: "Couldn't sign in. Try again." });
      setBusy(false);
    }
  };
  const download = () => Linking.openURL(APK_URL);

  const steps = [
    ['Save what friends tell you', 'Copy their WhatsApp message and tap "Read it". We fill in the place; you just confirm.'],
    ['Log where you ate', "A rating, what was good, what wasn't. Done before the bill arrives."],
    ['See where your people went', "Only people you've connected with, on a list or a map. Then jump to Maps or Swiggy."],
  ];
  const values = [
    [Lock, 'Private by design', 'Privacy rules live in the database, not just the app. Friends see only what you share with them.'],
    [Users, 'Friends, not strangers', 'No public reviews or star scores. Just what people you trust actually thought.'],
    [Wallet, 'Free, no ads', 'An IISc project made in Bengaluru. No card, no tracking, no catch.'],
  ] as const;
  const install = [
    ['Open the downloaded file', ' from your notifications or Files app.'],
    ['If Android asks, allow installs', ' from this source (Chrome or Files).'],
    ['Tap Install, then Open.', ''],
    ['Continue with Google', ' and connect with your friends.'],
  ];

  const bubble = (
    <View style={[styles.bubble, laptop && styles.bubbleWide]}>
      <T style={styles.bubbleWho}>Rahul</T>
      <T style={styles.bubbleText}>da try Brik Oven in Indiranagar, the truffle mushroom pizza is insane 🍕 bit pricey tho</T>
    </View>
  );
  const flow = (
    <View style={[styles.flow, laptop ? styles.flowWide : { alignSelf: 'center' }]}>
      <ClipboardPaste size={17} color={colors.primary} strokeWidth={2.2} />
      <T style={styles.flowText}>Paste it into Thinnava</T>
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

  const heroText = (
    <View style={laptop ? { flex: 1, maxWidth: 600 } : { gap: 14 }}>
      <T style={[styles.h1, !laptop && styles.h1Small]}>Every place your friends rave about, <T style={[styles.h1, !laptop && styles.h1Small, { color: colors.primary }]}>in one spot.</T></T>
      <T style={[styles.lead, !laptop && styles.leadSmall]}>
        {laptop
          ? 'No more scrolling chats to find "that biryani place Rahul said". Save what friends tell you, log where you ate, and see where your people have been. No strangers, no ads.'
          : 'Save what friends tell you, log where you ate, see where your people have been.'}
      </T>
      <View style={[styles.cta, !laptop && styles.ctaSmall]}>
        <Pressable onPress={() => go('download')} pressScale={0.98} style={[styles.btn, styles.btnPri, !laptop && styles.btnFull]} accessibilityRole="button" accessibilityLabel="Download for Android">
          <Download size={20} color={colors.onPrimary} strokeWidth={2.2} />
          <T style={styles.btnPriText}>Download for Android</T>
        </Pressable>
        <Pressable onPress={() => go('web')} pressScale={0.98} style={[styles.btn, styles.btnOut, !laptop && styles.btnFull]} accessibilityRole="button" accessibilityLabel="Use on iPhone or laptop">
          <T style={styles.btnOutText}>Use on iPhone or laptop</T>
        </Pressable>
      </View>
      <T style={[styles.meta, !laptop && { textAlign: 'center' }]}>Free APK · Android 10 or newer · Same Google account on every device</T>
    </View>
  );

  return (
    <View style={styles.root}>
      <RingsGround variant={2} />
      <ScrollView ref={scroll} contentContainerStyle={[styles.scroll, laptop && styles.scrollWide]}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <Image source={ICON} style={styles.logo} contentFit="cover" />
            <T variant="wordmark">Thinnava</T>
          </View>
          <View style={{ flex: 1 }} />
          {laptop ? (
            <>
              <T style={styles.navLink} onPress={() => go('how')} accessibilityRole="link">How it works</T>
              <T style={styles.navLink} onPress={() => go('download')} accessibilityRole="link">Get the app</T>
            </>
          ) : null}
          <Pressable onPress={signIn} pressScale={0.97} style={styles.signIn} accessibilityRole="button" accessibilityLabel="Sign in with Google">
            <T style={styles.signInText}>Sign in</T>
          </Pressable>
        </View>

        {laptop ? (
          <View style={styles.hero}>
            {heroText}
            <View style={styles.stage}>
              {bubble}{flow}{made}
              <Image source={CAT} style={styles.cat} contentFit="contain" />
            </View>
          </View>
        ) : (
          <View style={styles.stack}>
            <Image source={CAT} style={styles.catSmall} contentFit="contain" />
            {heroText}
            {bubble}{flow}{made}
          </View>
        )}

        <View onLayout={mark('how')} style={styles.section}>
          <T style={styles.eyebrow}>HOW IT WORKS</T>
          <T style={[styles.h2, !laptop && styles.h2Small]}>Three things, each takes seconds</T>
          <View style={[styles.row, !laptop && styles.col]}>
            {steps.map(([h, b], i) => (
              <View key={h} style={[styles.step, laptop && { flex: 1 }]}>
                <View style={styles.num}><T style={styles.numText}>{i + 1}</T></View>
                <T style={styles.stepH}>{h}</T>
                <T style={styles.stepB}>{b}</T>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.band, !laptop && styles.bandSmall]}>
          {values.map(([Icon, h, b]) => (
            <View key={h} style={laptop ? { flex: 1 } : undefined}>
              <View style={styles.ic}><Icon size={22} color={colors.primary} strokeWidth={2} /></View>
              <T style={styles.stepH}>{h}</T>
              <T style={styles.stepB}>{b}</T>
            </View>
          ))}
        </View>

        <View onLayout={mark('download')} style={[styles.dl, !laptop && styles.dlSmall]}>
          <View style={laptop ? { flex: 1.15 } : undefined}>
            <T style={[styles.eyebrow, { color: colors.primaryContainer }]}>GET THE APP</T>
            <T style={[styles.h2, !laptop && styles.h2Small, { color: colors.onPrimary }]}>Thinnava for Android</T>
            <T style={styles.dlSub}>Download the APK and install it in under a minute. Updates install over the old version, and your places stay.</T>
            <Pressable onPress={download} pressScale={0.98} style={[styles.btn, styles.btnLight, !laptop && styles.btnFull]} accessibilityRole="link" accessibilityLabel={`Download APK, version ${APK_VERSION}`}>
              <Download size={20} color={colors.primaryStrong} strokeWidth={2.2} />
              <T style={styles.btnLightText}>Download APK</T>
            </Pressable>
            <View style={styles.facts}>
              {[`Version ${APK_VERSION}`, 'Android 10+', 'Signed release'].map((f) => <T key={f} style={styles.fact}>{f}</T>)}
            </View>
          </View>
          <View style={[styles.how, laptop && { flex: 0.85 }]}>
            <T style={styles.howH}>Installing takes four taps</T>
            {install.map(([b, rest], i) => (
              <View key={b} style={styles.howRow}>
                <View style={styles.howNum}><T style={styles.howNumText}>{i + 1}</T></View>
                <T style={styles.howText}><T style={styles.howBold}>{b}</T>{rest}</T>
              </View>
            ))}
          </View>
        </View>

        <View onLayout={mark('web')} style={[styles.web, !laptop && styles.webSmall]}>
          <View style={laptop ? { flex: 1.1 } : undefined}>
            <T style={styles.eyebrow}>IPHONE OR LAPTOP</T>
            <T style={[styles.h2, !laptop && styles.h2Small]}>Thinnava works in your browser too</T>
            <T style={styles.webSub}>Same account, same places, nothing to install. On iPhone, tap Share then &quot;Add to Home Screen&quot; for an app-like icon.</T>
            <Pressable onPress={signIn} disabled={busy} pressScale={0.98} style={[styles.btn, styles.btnInk, !laptop && styles.btnFull]} accessibilityRole="button" accessibilityLabel="Continue with Google">
              <GoogleMark />
              <T style={styles.btnPriText}>{busy ? 'Signing in…' : 'Continue with Google'}</T>
            </Pressable>
            <T style={[styles.meta, { marginTop: 12 }, !laptop && { textAlign: 'center' }]}>
              By continuing you agree to the{' '}
              <T style={[styles.meta, styles.u]} onPress={() => Linking.openURL(LEGAL.terms)}>Terms</T> and{' '}
              <T style={[styles.meta, styles.u]} onPress={() => Linking.openURL(LEGAL.privacy)}>Privacy Policy</T>.
            </T>
          </View>
          <View style={[styles.art, laptop && { flex: 0.9 }]}>
            <View style={styles.lap}><Monitor size={30} color={colors.inkMuted} strokeWidth={1.8} /></View>
            <View style={styles.phone}>
              <View style={styles.mini}><T variant="meta">Rahul told you</T><T style={styles.miniH}>Brik Oven</T></View>
              <View style={styles.mini}><T variant="meta">Priya went</T><T style={styles.miniH}>Meghana Foods</T></View>
            </View>
          </View>
        </View>

        <View style={styles.foot}>
          <T style={styles.footLink} onPress={() => Linking.openURL(LEGAL.privacy)}>Privacy</T>
          <T style={styles.footLink} onPress={() => Linking.openURL(LEGAL.terms)}>Terms</T>
          <View style={{ flex: 1 }} />
          <T style={styles.footLink}>Made in Bengaluru</T>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  scrollWide: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 56 },
  top: { height: 72, flexDirection: 'row', alignItems: 'center', gap: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 32, height: 32, borderRadius: 10 },
  navLink: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkSoft },
  signIn: { height: 40, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1.5px ${colors.hairline}` },
  signInText: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.ink },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 40, paddingLeft: 40, marginTop: 24, marginBottom: 40 },
  h1: { fontFamily: fonts.display, fontSize: 54, lineHeight: 60, color: colors.ink, marginBottom: 18 },
  h1Small: { fontSize: 31, lineHeight: 35, textAlign: 'center', marginBottom: 0 },
  lead: { fontFamily: fonts.body, fontSize: 19, lineHeight: 29, color: colors.inkSoft, marginBottom: 28 },
  leadSmall: { fontSize: 15.5, lineHeight: 23, textAlign: 'center', marginBottom: 0 },
  cta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  ctaSmall: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch', alignSelf: 'stretch' },
  btn: { height: 54, paddingHorizontal: 24, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnFull: { alignSelf: 'stretch' },
  btnPri: { backgroundColor: colors.primary },
  btnPriText: { fontFamily: fonts.bodyHeavy, fontSize: 16.5, color: colors.onPrimary, textAlign: 'center' },
  btnOut: { backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1.5px ${colors.hairline}` },
  btnOutText: { fontFamily: fonts.bodyHeavy, fontSize: 16.5, color: colors.ink, textAlign: 'center' },
  btnLight: { backgroundColor: colors.surface, alignSelf: 'flex-start' },
  btnLightText: { fontFamily: fonts.bodyHeavy, fontSize: 16.5, color: colors.primaryStrong },
  btnInk: { backgroundColor: colors.ink, alignSelf: 'flex-start' },
  meta: { fontFamily: fonts.bodySemi, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 14 },
  u: { textDecorationLine: 'underline', color: colors.inkSoft, marginTop: 0 },

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

  section: { marginTop: 56 },
  eyebrow: { fontFamily: fonts.bodyHeavy, fontSize: 13, letterSpacing: 1.1, color: colors.primary, marginBottom: 10 },
  h2: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.ink, marginBottom: 22 },
  h2Small: { fontSize: 28, lineHeight: 32 },
  row: { flexDirection: 'row', gap: 18 },
  col: { flexDirection: 'column', gap: 12 },
  step: { backgroundColor: colors.surface, borderRadius: radii.panel, padding: 24, boxShadow: shadows.card },
  num: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  numText: { fontFamily: fonts.display, fontSize: 19, color: colors.onPrimaryContainer },
  stepH: { fontFamily: fonts.display, fontSize: 20, lineHeight: 25, color: colors.ink, marginBottom: 6 },
  stepB: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, color: colors.inkSoft },

  band: { flexDirection: 'row', gap: 34, backgroundColor: colors.surface, borderRadius: 32, padding: 44, marginTop: 40 },
  bandSmall: { flexDirection: 'column', gap: 24, padding: 26 },
  ic: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },

  dl: { flexDirection: 'row', gap: 44, backgroundColor: colors.primaryStrong, borderRadius: 34, padding: 52, marginTop: 56 },
  dlSmall: { flexDirection: 'column', gap: 28, padding: 26 },
  dlSub: { fontFamily: fonts.body, fontSize: 17.5, lineHeight: 26, color: colors.primaryContainer, marginBottom: 26 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  fact: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryContainer, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 14 },
  how: { backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: radii.panel, padding: 24, gap: 12, alignSelf: 'stretch' },
  howH: { fontFamily: fonts.display, fontSize: 18, color: colors.onPrimary, marginBottom: 2 },
  howRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  howNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  howNumText: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.primaryStrong },
  howText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.primaryContainer },
  howBold: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.onPrimary },

  web: { flexDirection: 'row', gap: 40, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 34, padding: 50, marginTop: 24 },
  webSmall: { flexDirection: 'column', alignItems: 'stretch', padding: 26, gap: 28 },
  webSub: { fontFamily: fonts.body, fontSize: 17.5, lineHeight: 26, color: colors.inkSoft, marginBottom: 26 },
  art: { height: 260, alignSelf: 'stretch' },
  lap: { position: 'absolute', right: 0, top: 40, width: 250, height: 170, borderRadius: 14, backgroundColor: colors.surfaceTint, boxShadow: `inset 0px 0px 0px 5px ${colors.hairline}`, alignItems: 'center', justifyContent: 'center' },
  phone: { position: 'absolute', left: 10, top: 0, width: 160, height: 250, borderRadius: 30, backgroundColor: colors.background, boxShadow: `inset 0px 0px 0px 6px ${colors.ink}`, padding: 22, paddingTop: 30, gap: 10 },
  mini: { backgroundColor: colors.surface, borderRadius: 14, padding: 10, boxShadow: shadows.card },
  miniH: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },

  foot: { flexDirection: 'row', gap: 22, marginTop: 'auto', paddingTop: 44, paddingLeft: 4 },
  footLink: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkMuted },
});
