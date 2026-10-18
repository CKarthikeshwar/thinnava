import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { Button, Pressable, Sheet, T } from '@/components';
import { storage } from '@/lib/storage';
import { IS_WEB } from '@/lib/layout';
import { colors, fonts, radii, shadows } from '@/theme';

const WAVE = require('../../../assets/images/cat-waving-small.png');
const KEY = 'installCardGone';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
// Browsers that can install the site themselves (Android Chrome) announce it once, early; keep that event for later.
let deferred: InstallEvent | null = null;
if (IS_WEB && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; });
}

const standalone = () => {
  if (!IS_WEB || typeof window === 'undefined') return true;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
};
const isIOS = () => IS_WEB && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const gone = () => { try { return !!storage.getNumber(KEY); } catch { return false; } };

/**
 * Phone-browser Home (spec §18.3): "Keep Thinnava on your home screen". Shown only in a browser tab, never once it runs
 * from the home screen. "Show me how" uses the browser's own install prompt when there is one, else a steps sheet.
 */
export function InstallCard() {
  const [hidden, setHidden] = useState(() => standalone() || gone());
  const sheet = useRef<BottomSheetModal>(null);
  if (hidden) return null;
  const close = () => { try { storage.set(KEY, Date.now()); } catch { /* best effort */ } setHidden(true); };
  const how = async () => {
    if (deferred) {
      const e = deferred;
      deferred = null;
      await e.prompt();
      if ((await e.userChoice).outcome === 'accepted') close();
      return;
    }
    sheet.current?.present();
  };
  const steps = isIOS()
    ? ["Tap Share (the square with an arrow) in Safari's bar", 'Scroll down and tap Add to Home Screen', 'Tap Add. Thinnava now opens like an app.']
    : ['Open your browser menu (⋮)', 'Tap Add to Home screen or Install app', 'Confirm. Thinnava now opens like an app.'];
  return (
    <>
      <View style={styles.card}>
        <Image source={WAVE} style={styles.cat} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <T style={styles.title}>Keep Thinnava on your home screen</T>
          <T variant="meta" style={{ marginTop: 2 }}>Opens full screen, like an app.</T>
          <T style={styles.how} onPress={how} accessibilityRole="button">Show me how</T>
        </View>
        <Pressable onPress={close} hitSlop={10} pressScale={0.9} style={{ alignSelf: 'flex-start' }} accessibilityRole="button" accessibilityLabel="Don't show again">
          <X size={18} color={colors.inkMuted} strokeWidth={2.2} />
        </Pressable>
      </View>
      <Sheet ref={sheet} title="Put Thinnava on your home screen">
        <T variant="meta" style={{ marginTop: -6, marginBottom: 8 }}>Takes 10 seconds.</T>
        {steps.map((s, i) => (
          <View key={s} style={[styles.step, i > 0 && styles.line]}>
            <View style={styles.num}><T style={styles.numText}>{i + 1}</T></View>
            <T variant="body" style={{ flex: 1, color: colors.ink }}>{s}</T>
          </View>
        ))}
        <Button label="Got it" variant="tonal" onPress={() => sheet.current?.dismiss()} style={{ marginTop: 12 }} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: 12, paddingHorizontal: 14, boxShadow: shadows.card },
  cat: { width: 52, height: 52 },
  title: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.ink },
  how: { fontFamily: fonts.bodyHeavy, fontSize: 13.5, color: colors.primary, marginTop: 5, alignSelf: 'flex-start' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  line: { borderTopWidth: 1, borderTopColor: colors.hairline },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.onPrimaryContainer },
});
