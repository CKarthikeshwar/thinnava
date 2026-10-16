import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Globe, Heart, Layers, MapPin as MapPinIcon, MessageCircle, Navigation, Plus, UserRound, Utensils } from 'lucide-react-native';
import {
  Avatar, AvatarStack, Button, CatPeek, Chip, ChipInput, Cluster, Dialog, Divider, EmptyState, EntryCard, GoogleMark,
  IconButton, ListRow, ListSurface, MapPin, OfflineBanner, Panel, ReviewPill, Screen, SearchBar, SectionLabel,
  Segmented, Sheet, SheetOption, SourceMark, T, TextField, Thumb, TopBar, YouDot, showSnack,
} from '@/components';
import { colors, space } from '@/theme';

/** Dev-only component gallery (spec §30 M1): every building block, to compare against design/phase1.html and phase2.html. */
export default function GalleryRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

function Gallery() {
  const sheet = useRef<BottomSheetModal>(null);
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState(false);
  const [seg, setSeg] = useState<'places' | 'people'>('places');
  const [loved, setLoved] = useState(['Chicken bao']);
  const [user, setUser] = useState('karthik_eats');
  const taken = user === 'karthik';
  return (
    <View style={{ flex: 1 }}>
      <Screen header={<TopBar title="Design gallery" onBack={() => router.back()} />} contentStyle={styles.body}>
        <Section title="Type">
          <T variant="display">Thinnava</T>
          <T variant="headline">Remember every place your friends tell you about</T>
          <T variant="title">Sheet and screen titles</T>
          <T variant="place">Burger Factory</T>
          <T variant="body">Body copy is Nunito 15 in Slate Ink, warm and easy to read.</T>
          <T variant="bodyStrong">Strong body for names in lists</T>
          <T variant="meta">Meta line · Koramangala · 2h</T>
        </Section>

        <Section title="Buttons">
          <Button label="Save visit" />
          <Button label="Directions" variant="tonal" icon={Navigation} />
          <Button label="Find people you know" variant="outline" />
          <Button label="Continue with Google" variant="strong" leading={<GoogleMark />} />
          <Button label="Save (disabled until valid)" disabled />
          <View style={styles.row}>
            <Button label="Accept" small />
            <Button label="Decline" small variant="tonal" />
            <Button label="Requested" small variant="outline" />
          </View>
        </Section>

        <Section title="Chips, pills and marks">
          <View style={styles.wrap}>
            <Chip label="All" selected />
            <Chip label="Visited" icon={MapPinIcon} />
            <Chip label="Category" dropdown />
            <Chip label="From friends" selected removable />
          </View>
          <View style={styles.wrap}>
            <ReviewPill rating="good" />
            <ReviewPill rating="okayish" />
            <ReviewPill rating="bad" />
          </View>
          <View style={styles.wrap}>
            <Avatar name="Ananya R" />
            <Avatar name="Rahul" />
            <Avatar name="Meera K" />
            <SourceMark kind="friend" />
            <SourceMark kind="internet" />
            <AvatarStack names={['Ananya', 'Rahul', 'Meera']} />
            <IconButton icon={Heart} label="Wishlist" />
            <IconButton icon={Heart} label="Wishlisted" active />
            <IconButton icon={MessageCircle} label="Notifications" badge />
          </View>
        </Section>

        <Section title="Entry cards (Home timeline)">
          <EntryCard kind="visit" who={{ name: 'Ananya', text: 'went to' }} place="Bao Story" meta="Indiranagar · with Arjun" time="2h"
            loved={['Chicken bao', 'chilli oil noodles']} disliked={['Iced tea']} rating="good" pricePerPerson={450} onPress={() => showSnack({ text: 'Opens the entry (M4)' })} />
          <EntryCard kind="friend" who={{ name: 'Rahul', text: 'told you about' }} place="Burger Factory" meta="Koramangala · went Oct 10" time="5h"
            loved={['Chicken burger']} disliked={['Shake']} rating="good" pricePerPerson={300} isPrivate />
          <EntryCard kind="internet" who={{ text: 'From a reel' }} place="Meghana Foods" meta="Residency Road" time="1d"
            loved={['Boneless chicken biryani']} rating="okayish" isPrivate />
        </Section>

        <Section title="Fields">
          <TextField label="Username" prefix="@" value={user} onChangeText={setUser} autoCapitalize="none"
            status={taken ? { kind: 'error', text: '@karthik is taken. Try another.' } : { kind: 'success', text: `@${user} is available` }} />
          <TextField label="Bio" optional placeholder="Biryani first, questions later…" />
          <TextField label="Price per person" prefix="₹" keyboardType="number-pad" placeholder="300" />
          <ChipInput label="Loved" value={loved} onChange={setLoved} />
        </Section>

        <Section title="Bars and lists">
          <SearchBar placeholder="Search places" />
          <Segmented options={[{ key: 'places', label: 'Places' }, { key: 'people', label: 'People' }]} value={seg} onChange={setSeg} />
          <OfflineBanner />
          <ListSurface style={styles.list}>
            <SectionLabel>Near you</SectionLabel>
            <ListRow leading={<Thumb><Utensils size={22} color={colors.primaryStrong} /></Thumb>} title="Bao Story" subtitle="Indiranagar · 120 m" chevron onPress={() => {}} />
            <Divider />
            <ListRow leading={<Avatar name="Anand K" />} title="Anand K" subtitle="@anandk" trailing={<Button label="Connect" small />} />
          </ListSurface>
        </Section>

        <Section title="Sheets, dialogs, snackbars">
          <Button label="Open filter sheet" variant="tonal" onPress={() => sheet.current?.present()} />
          <Button label="Open delete dialog" variant="tonal" onPress={() => setDialog(true)} />
          <Button label="Show snackbar" variant="tonal" onPress={() => showSnack({ text: 'Added to your wishlist', action: { label: 'Who sees it', onPress: () => {} } })} />
        </Section>

        <Section title="Map pins">
          <Panel style={styles.mapPanel}>
            <View style={styles.wrap}>
              <MapPin label="Bao Story" person="Ananya" />
              <MapPin label="MTR" glyph="went" mine />
              <MapPin label="Toit" glyph="wishlist" selected />
              <MapPin label="Reel find" glyph="internet" />
              <Cluster count={5} />
              <YouDot />
            </View>
          </Panel>
        </Section>

        <Section title="Empty state (cat climbs over the card)">
          <EmptyState title="Nothing here yet" body="Places you save will show up here.">
            <Button label="Log a place you've been" icon={Plus} />
          </EmptyState>
          <View style={{ height: 8 }} />
          <CatPeek width={110} />
          <Panel style={{ padding: 16 }}><T variant="body">A smaller peek, as on setup screens.</T></Panel>
        </Section>
      </Screen>

      <Sheet ref={sheet} title="Show">
        {[
          ['all', 'Everything', 'All entries', Layers],
          ['connections', 'Connections', 'Reviews they posted', UserRound],
          ['friends', 'From friends', 'What friends told you', MessageCircle],
          ['internet', 'Internet', 'Reels, videos, links', Globe],
          ['mine', 'Mine', 'Places you went', Utensils],
        ].map(([k, label, hint, Icon]: any) => (
          <SheetOption key={k} label={label} hint={hint} icon={Icon} selected={filter === k} onPress={() => { setFilter(k); sheet.current?.dismiss(); }} />
        ))}
      </Sheet>
      <Dialog visible={dialog} title="Delete this visit?" body="It'll disappear for everyone you shared it with." confirmLabel="Delete" destructive
        onCancel={() => setDialog(false)} onConfirm={() => { setDialog(false); showSnack({ text: 'Deleted' }); }} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <T variant="fieldLabel" color={colors.inkMuted} style={styles.sectionTitle}>{title.toUpperCase()}</T>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 60 },
  section: { marginTop: 18 },
  sectionTitle: { paddingHorizontal: space.gutter, letterSpacing: 0.6, marginBottom: 10 },
  sectionBody: { paddingHorizontal: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  list: { borderRadius: 26, paddingBottom: 6 },
  mapPanel: { padding: 16, backgroundColor: colors.mapLand },
});
