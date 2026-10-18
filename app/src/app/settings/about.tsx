import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { ExternalLink, Sparkles } from 'lucide-react-native';
import { Button, Panel, Screen, Segmented, T, TopBar } from '@/components';
import { Markdown } from '@/features/legal/Markdown';
import { PRIVACY_MD, TERMS_MD } from '@/features/legal/text';
import { LEGAL } from '@/lib/links';
import { colors, fonts, radii, shadows, space } from '@/theme';

/**
 * About & privacy (spec §14 F2, §27.4): what Thinnava is, the Gemini disclosure up front, and the same privacy policy
 * and terms as the published pages (synced from docs/legal by tools/legal/sync.mjs).
 */
export default function About() {
  const [doc, setDoc] = useState<'privacy' | 'terms'>('privacy');
  return (
    <Screen header={<TopBar title="About & privacy" onBack={() => router.back()} />} contentStyle={styles.body}>
      <View style={styles.app}>
        <T variant="wordmark">Thinnava</T>
        <T variant="meta">Version {Constants.expoConfig?.version ?? '0.1.0'} · A student project from IISc, Bengaluru</T>
      </View>
      <View style={styles.ai}>
        <Sparkles size={20} color={colors.primaryStrong} strokeWidth={2} />
        <T style={styles.aiText}>Copied or shared messages are sent to Google's Gemini to read them and are not stored by Thinnava.</T>
      </View>
      <View style={styles.tabs}>
        <Segmented options={[{ key: 'privacy', label: 'Privacy policy' }, { key: 'terms', label: 'Terms' }]} value={doc} onChange={setDoc} />
      </View>
      <Panel style={styles.doc}>
        <Markdown source={doc === 'privacy' ? PRIVACY_MD : TERMS_MD} />
      </Panel>
      <Button label="Open on the web" variant="outline" icon={ExternalLink} small style={styles.web}
        onPress={() => Linking.openURL(doc === 'privacy' ? LEGAL.privacy : LEGAL.terms).catch(() => {})} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.gutter, paddingTop: 4 },
  app: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  ai: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surfaceTint, borderRadius: radii.field + 2, padding: space.md, marginTop: 4 },
  aiText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  tabs: { marginTop: 16, marginBottom: 12 },
  doc: { padding: 18, boxShadow: shadows.card },
  web: { alignSelf: 'center', marginTop: 16 },
});
