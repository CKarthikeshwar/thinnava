import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowRight, UsersRound } from 'lucide-react-native';
import { Button, Dots, MapPin, Pressable, T } from '@/components';
import { colors, radii, shadows } from '@/theme';

const OFFERING = require('../../../../assets/images/cat-offering.png');

/** A1b Intro (spec §14): the promise and the social map in one page. Skip / Next / swipe → A2. */
export function IntroPage({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <T variant="wordmark" style={{ fontSize: 22 }}>Thinnava</T>
        <Pressable onPress={onNext} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip">
          <T variant="label" style={{ fontSize: 14 }}>Skip</T>
        </Pressable>
      </View>
      <Image source={OFFERING} style={styles.cat} contentFit="contain" accessibilityElementsHidden />
      <T variant="headline" style={styles.center}>Remember every place your friends tell you about</T>
      <T variant="body" style={[styles.center, { marginTop: 8 }]}>No more scrolling chats to find "that biryani place Rahul said".</T>

      <View style={styles.map} accessible accessibilityLabel="A small map with your friends' pins">
        <View style={[styles.road, { top: 60 }]} />
        <View style={[styles.road, { top: 118 }]} />
        <View style={[styles.roadV, { left: '34%' }]} />
        <View style={[styles.roadV, { left: '68%' }]} />
        <View style={[styles.park, { top: -10, left: 8 }]} />
        <T style={[styles.mapLabel, { top: 82, left: 12 }]}>KORAMANGALA</T>
        <T style={[styles.mapLabel, { top: 82, right: 14 }]}>DOMLUR</T>
        <View style={[styles.at, { top: 14, left: '14%' }]}><MapPin label="Good" person="Ananya" /></View>
        <View style={[styles.at, { top: 36, left: '58%' }]}><MapPin label="Good" person="Rahul" /></View>
        <View style={styles.caption}>
          <UsersRound size={18} color={colors.primary} strokeWidth={2} />
          <T style={styles.captionText}>See where your people ate. No strangers, no ads.</T>
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <Dots count={3} active={1} />
      <Button style={{ marginTop: 18 }} label="Next" variant="strong" trailingIcon={ArrowRight} onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 22, paddingBottom: 18 },
  head: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cat: { width: 130, height: 130 * (680 / 610), alignSelf: 'center', marginTop: 2 },
  center: { textAlign: 'center' },
  map: { marginTop: 18, height: 170, borderRadius: radii.panel, overflow: 'hidden', backgroundColor: colors.mapLand, boxShadow: shadows.panel },
  road: { position: 'absolute', left: 0, right: 0, height: 10, backgroundColor: colors.mapRoad, borderColor: colors.mapRoadEdge, borderTopWidth: 1, borderBottomWidth: 1 },
  roadV: { position: 'absolute', top: 0, bottom: 0, width: 10, backgroundColor: colors.mapRoad, borderColor: colors.mapRoadEdge, borderLeftWidth: 1, borderRightWidth: 1 },
  park: { position: 'absolute', width: 70, height: 50, borderRadius: 24, backgroundColor: colors.mapPark },
  mapLabel: { position: 'absolute', fontFamily: 'Nunito_700Bold', fontSize: 10.5, letterSpacing: 0.6, color: colors.inkMuted },
  at: { position: 'absolute' },
  caption: { position: 'absolute', left: 10, right: 10, bottom: 10, backgroundColor: colors.surface, borderRadius: radii.thumb, paddingVertical: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, boxShadow: '0px 6px 16px -8px rgba(20,30,50,0.4)' },
  captionText: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: colors.ink },
});
