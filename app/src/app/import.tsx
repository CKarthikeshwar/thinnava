import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Image } from 'expo-image';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Search } from 'lucide-react-native';
import { Button, ListSurface, Pressable, Radio, T, TextField, TopBar, showSnack } from '@/components';
import type { Place } from '@/features/places/api';
import { useTakePicked } from '@/features/places/picked';
import { CategoryThumb } from '@/features/places/components';
import { markClipboardHandled } from '@/features/import/clipboard';
import {
  extractText, findUrl, LOW_CONFIDENCE, myFriendNames, resolveLink, SAVED_KEYS, saveSaved,
  type ExtractedItem, type SavedKind,
} from '@/features/saved/api';
import { toInput } from '@/features/saved/draft';
import { canSave, emptyDraft, SavedFields, type Flags, type SavedDraft } from '@/features/saved/SavedFields';
import { placePage, setWishlist } from '@/features/visits/api';
import { FnError } from '@/lib/functions';
import { getNear } from '@/lib/location';
import { formatDistance } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { colors, durations, fonts, radii, shadows, space, useMotion } from '@/theme';

const PEEK = require('../../assets/images/cat-peek.png');
const SITTING = require('../../assets/images/cat-sitting.png');

type Item = { draft: SavedDraft; flags: Flags; candidates: Place[]; askWhich: boolean };
type Phase =
  | { kind: 'reading' }
  | { kind: 'failed'; message: string; partial: Item | null }
  | { kind: 'confirm'; items: Item[]; index: number }
  | { kind: 'which'; items: Item[]; index: number };

/**
 * /import (spec §10, §26.6): D7 reading → D8 confirmation (one place at a time) → D8b "Which one?".
 * Params: text (copied or shared), url (shared link), source (friend | internet), from ('share' returns to Home).
 * The original message is shown for checking only and is never saved (§6.3).
 */
/**
 * /import is a native transparent modal, so it sits above the root BottomSheetModalProvider; sheets opened inside it
 * (D6 friend name, dates) need their own host or they'd render behind the screen.
 */
export default function ImportScreen() {
  return (
    <BottomSheetModalProvider>
      <Import />
    </BottomSheetModalProvider>
  );
}

function Import() {
  const params = useLocalSearchParams<{ text?: string; url?: string; source?: SavedKind; from?: string }>();
  const text = (params.text ?? '').trim();
  const qc = useQueryClient();
  const names = useQuery({ queryKey: ['friendNames'], queryFn: myFriendNames });
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' });
  const [caption, setCaption] = useState('');
  const [captionFor, setCaptionFor] = useState<'instagram' | 'youtube' | null>(null);
  const [alsoWishlist, setAlsoWishlist] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    markClipboardHandled();
    read(text, params.url ?? findUrl(text), params.source).then(setPhaseFromRead);
  }, []);

  const setPhaseFromRead = (r: ReadResult) => {
    if (r.caption) setCaptionFor(r.caption);
    if (r.items.length) setPhase(r.items[0].askWhich ? { kind: 'which', items: r.items, index: 0 } : { kind: 'confirm', items: r.items, index: 0 });
    else setPhase({ kind: 'failed', message: r.message, partial: r.partial });
  };

  // ---- editing the current item ----
  const current = phase.kind === 'confirm' || phase.kind === 'which' ? phase.items[phase.index] : null;
  // The wishlist is for places I haven't been to (§9): no "Also add to my wishlist" for a place I've visited.
  const pickedId = current?.draft.place?.placeId;
  const picked = useQuery({ queryKey: ['placePage', pickedId], queryFn: () => placePage(pickedId!), enabled: !!pickedId });
  const beenThere = !!picked.data?.my_visits?.length;
  const patch = (p: Partial<SavedDraft>) => {
    if (phase.kind !== 'confirm') return;
    const items = phase.items.slice();
    const it = items[phase.index];
    // Editing a flagged field clears its flag.
    const flags = { ...it.flags, ...(p.place ? { place: false } : {}), ...(p.rating !== undefined ? { rating: false } : {}),
      ...(p.price !== undefined ? { price: false } : {}), ...(p.visitedOn !== undefined ? { visitedOn: false } : {}) };
    items[phase.index] = { ...it, draft: { ...it.draft, ...p }, flags };
    setPhase({ ...phase, items });
  };
  useTakePicked((place) => {
    if (phase.kind === 'which') {
      const items = phase.items.slice();
      items[phase.index] = { ...items[phase.index], draft: { ...items[phase.index].draft, place }, flags: { ...items[phase.index].flags, place: false }, askWhich: false };
      setPhase({ kind: 'confirm', items, index: phase.index });
    } else patch({ place });
  });

  const finish = () => {
    if (params.from === 'share') router.replace('/(tabs)');
    else router.back();
  };
  const next = () => {
    if (phase.kind !== 'confirm' && phase.kind !== 'which') return finish();
    const i = phase.index + 1;
    setAlsoWishlist(false);
    if (i >= phase.items.length) return finish();
    setPhase(phase.items[i].askWhich ? { kind: 'which', items: phase.items, index: i } : { kind: 'confirm', items: phase.items, index: i });
  };

  const save = async () => {
    if (phase.kind !== 'confirm' || !current || !canSave(current.draft)) return;
    setBusy(true);
    try {
      const d = current.draft;
      const r = await saveSaved(toInput(randomUUID(), d));
      if (alsoWishlist && !beenThere && d.place) await setWishlist(d.place.placeId, true);
      // A friend name created by this save is now a normal name for the next items.
      if (d.friend?.isNew && r.friend_name_id) {
        const items = phase.items.map((it) => it.draft.friend?.id === d.friend!.id ? { ...it, draft: { ...it.draft, friend: { ...it.draft.friend!, id: r.friend_name_id!, isNew: false } } } : it);
        setPhase({ ...phase, items });
      }
      await Promise.all([...SAVED_KEYS, ['myWishlist']].map((k) => qc.invalidateQueries({ queryKey: k })));
      showSnack({ text: d.kind === 'friend' ? `Saved ${d.friend!.name}'s experience` : 'Saved' });
      setBusy(false);
      next();
    } catch (e) {
      showSnack({ text: friendlyError(e, "Couldn't save. Try again.") });
      setBusy(false);
    }
  };

  const readCaption = async () => {
    if (phase.kind !== 'confirm' || !caption.trim()) return;
    const link = phase.items[0].draft.link;
    setPhase({ kind: 'reading' });
    const r = await read(caption, null, 'internet');
    setCaptionFor(null);
    const withLink = (it: Item): Item => ({ ...it, draft: { ...it.draft, kind: 'internet', link } });
    setPhaseFromRead({ ...r, items: r.items.map(withLink), partial: r.partial ? withLink(r.partial) : null });
  };

  // ---- views ----
  if (phase.kind === 'reading') return <Reading />;
  if (phase.kind === 'failed') {
    return (
      <Failed message={phase.message} onFill={() => setPhase({ kind: 'confirm', items: [phase.partial ?? blank(params.source ?? 'friend')], index: 0 })} onClose={finish} />
    );
  }
  if (phase.kind === 'which' && current) {
    return (
      <Which item={current} onBack={() => setPhase({ ...phase, kind: 'confirm' })}
        onUse={(place) => {
          const items = phase.items.slice();
          items[phase.index] = { ...current, draft: { ...current.draft, place }, flags: { ...current.flags, place: false }, askWhich: false };
          setPhase({ kind: 'confirm', items, index: phase.index });
        }} />
    );
  }
  if (phase.kind !== 'confirm' || !current) return null;
  const total = phase.items.length;
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar close compact title="Check what we found" onBack={finish}
        actions={total > 1 ? <T style={styles.step}>{phase.index + 1} of {total}</T> : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {captionFor ? (
            <View style={styles.captionBox}>
              <TextField label="Paste the caption" optional value={caption} onChangeText={(t) => setCaption(t.slice(0, 4000))} multiline
                placeholder={captionFor === 'instagram' ? 'Copy the caption from Instagram and paste it here' : 'Paste the video description here'} />
              {caption.trim() ? <Button label="Read caption" variant="tonal" small onPress={readCaption} style={{ alignSelf: 'flex-start' }} /> : null}
            </View>
          ) : null}
          <SavedFields value={current.draft} onChange={patch} names={names.data ?? []} flags={current.flags}
            onChangePlace={() => {
              if (current.candidates.length > 1) setPhase({ ...phase, kind: 'which' });
              else router.push({ pathname: '/pick-place', params: { for: 'select', q: current.draft.place?.name ?? '' } });
            }} />
          {beenThere ? null : (
            <View style={styles.wish}>
              <T style={styles.wishText}>Also add to my wishlist</T>
              <Switch value={alsoWishlist} onValueChange={setAlsoWishlist} trackColor={{ true: colors.primary, false: colors.hairline }} thumbColor={colors.surface} />
            </View>
          )}
          {text && !findUrlOnly(text) ? (
            <View style={styles.field}>
              <T variant="fieldLabel">Original message <T style={styles.optl}>for checking · not saved</T></T>
              <View style={styles.quote}><T style={styles.quoteText}>{text}</T></View>
            </View>
          ) : null}
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button label="Discard" variant="outline" onPress={next} style={styles.discard} />
          <Button label={busy ? 'Saving…' : 'Save'} disabled={!canSave(current.draft) || busy} onPress={save} style={{ flex: 1 }}
            accessibilityHint={current.draft.kind === 'friend' && !current.draft.friend ? 'Add who told you first' : undefined} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- reading ----------

type ReadResult = { items: Item[]; partial: Item | null; message: string; caption?: 'instagram' | 'youtube' };
const blank = (kind: SavedKind): Item => ({ draft: emptyDraft(kind), flags: {}, candidates: [], askWhich: false });
const findUrlOnly = (t: string) => { const u = findUrl(t); return !!u && t.replace(u, '').trim().length === 0; };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function toItem(it: ExtractedItem, kind: SavedKind, link: string): Item {
  const low = (c: number) => c < LOW_CONFIDENCE;
  const best = it.candidates[0] ?? null;
  // D8b: only when the name matches several Google places (e.g. two "Meghana Foods").
  const same = it.candidates.filter((c) => norm(c.name).includes(norm(it.place.name)) || norm(it.place.name).includes(norm(c.name)));
  return {
    draft: {
      kind, friend: null, link, place: best, rating: it.review, loved: it.lovedDishes, disliked: it.dislikedDishes,
      price: it.pricePerPerson ? String(it.pricePerPerson) : '', visitedOn: kind === 'friend' ? it.visitDate : null,
    },
    flags: {
      place: !best || low(it.confidence.place), rating: !!it.review && low(it.confidence.review),
      price: !!it.pricePerPerson && low(it.confidence.pricePerPerson), visitedOn: !!it.visitDate && low(it.confidence.visitDate),
    },
    candidates: it.candidates,
    askWhich: same.length > 1,
  };
}

/** §10.1: a link is resolved by type first; remaining text (and a page's title/description) goes to the AI. */
async function read(text: string, url: string | null, source?: SavedKind): Promise<ReadResult> {
  const near = await getNear({ ask: false }).catch(() => null);
  const failMsg = "Couldn't find a place in that";
  try {
    if (url) {
      const link = await resolveLink(url, text);
      const rest = text.replace(url, '').trim();
      if (link.kind === 'maps') {
        const item = blank('internet');
        item.draft = { ...item.draft, link: link.resolvedUrl, place: link.suggestion ?? null };
        item.flags = { place: !link.suggestion };
        return { items: [item], partial: null, message: failMsg };
      }
      if (link.kind === 'instagram' || link.kind === 'youtube') {
        if (rest.length > 15) {
          const r = await extractText(rest, near);
          if (r.foodRelated && r.items.length) return { items: r.items.map((it) => toItem(it, 'internet', link.resolvedUrl)), partial: null, message: failMsg };
        }
        const item = blank('internet');
        item.draft = { ...item.draft, link: link.resolvedUrl };
        return { items: [item], partial: null, message: failMsg, caption: link.kind };
      }
      const forAi = [rest, link.meta?.hint, link.meta?.title, link.meta?.description].filter(Boolean).join('\n');
      const partial = { ...blank('internet'), draft: { ...emptyDraft('internet'), link: link.resolvedUrl } };
      if (!forAi) return { items: [], partial, message: failMsg };
      const r = await extractText(forAi, near);
      return r.foodRelated && r.items.length
        ? { items: r.items.map((it) => toItem(it, 'internet', link.resolvedUrl)), partial: null, message: failMsg }
        : { items: [], partial, message: failMsg };
    }
    const kind = source ?? 'friend';
    const r = await extractText(text, near);
    return r.foodRelated && r.items.length
      ? { items: r.items.map((it) => toItem(it, kind, '')), partial: null, message: failMsg }
      : { items: [], partial: blank(kind), message: failMsg };
  } catch (e) {
    const code = e instanceof FnError ? e.code : '';
    const message = code === 'daily_limit' ? "You've read a lot of messages today" : code === 'ai_busy' ? 'Reading is busy right now' : code === 'network' ? "You're offline" : failMsg;
    return { items: [], partial: blank(source ?? (url ? 'internet' : 'friend')), message };
  }
}

// ---------- views ----------

/** D7 "Reading this message…" (spec §14 D7, phase2 mockup): the cat over a card, rising like a sheet. */
function Reading() {
  const { d } = useMotion();
  return (
    <View style={styles.scrim}>
      <Animated.View entering={SlideInDown.duration(d(durations.sheetIn))} style={styles.sheet}>
        <View style={styles.handle} />
        <Image source={PEEK} style={styles.peek} contentFit="contain" accessibilityElementsHidden />
        <View style={styles.readCard} accessibilityLiveRegion="polite">
          <T variant="title" style={{ fontSize: 17 }}>Reading this message…</T>
          <View style={styles.lines}>
            <View style={[styles.line, { width: '80%' }]} />
            <View style={[styles.line, { width: '62%' }]} />
            <View style={[styles.line, { width: '72%' }]} />
          </View>
          <ActivityIndicator color={colors.primary} style={{ position: 'absolute', right: 16, top: 16 }} />
        </View>
        <T variant="meta" style={styles.readSub}>Looking for the place, dishes and price.</T>
      </Animated.View>
    </View>
  );
}

/** D7 failed: "Couldn't find a place in that" → Fill it in (the form, prefilled with whatever was found). */
function Failed({ message, onFill, onClose }: { message: string; onFill: () => void; onClose: () => void }) {
  return (
    <View style={styles.scrim}>
      <Animated.View entering={FadeIn.duration(200)} style={[styles.sheet, styles.failed]}>
        <Image source={SITTING} style={styles.sitting} contentFit="contain" accessibilityElementsHidden />
        <T variant="title" style={styles.centerText}>{message}</T>
        <T variant="body" style={[styles.centerText, { marginTop: 6 }]}>No worries, fill it in yourself.</T>
        <Button label="Fill it in" onPress={onFill} style={{ marginTop: 18 }} />
        <Button label="Not now" variant="outline" onPress={onClose} style={{ marginTop: 10 }} />
      </Animated.View>
    </View>
  );
}

/** D8b "Which one?" (spec §14): only when the name matches several Google places. */
function Which({ item, onUse, onBack }: { item: Item; onUse: (p: Place) => void; onBack: () => void }) {
  const [sel, setSel] = useState(item.draft.place?.placeId ?? item.candidates[0]?.placeId);
  const chosen = item.candidates.find((c) => c.placeId === sel) ?? null;
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar compact title="Which one?" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <T variant="body" style={styles.whichLead}>
          We found {item.candidates.length} places called <T variant="body" style={{ fontFamily: fonts.bodyHeavy, color: colors.ink }}>{item.candidates[0]?.name}</T>. Pick the right one.
        </T>
        <View style={styles.whichPanel}>
          {item.candidates.map((c, i) => (
            <Pressable key={c.placeId} onPress={() => setSel(c.placeId)} pressScale={0.99} style={[styles.cand, i > 0 && styles.candDivider]}
              accessibilityRole="radio" accessibilityState={{ checked: sel === c.placeId }} accessibilityLabel={`${c.name}, ${c.address ?? c.area ?? ''}`}>
              <CategoryThumb category={c.category} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{c.name}</T>
                <T variant="meta" style={{ fontSize: 13, marginTop: 2 }}>{[c.address ?? c.area, formatDistance(c.distanceM)].filter(Boolean).join(' · ')}</T>
              </View>
              <Radio on={sel === c.placeId} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => router.push({ pathname: '/pick-place', params: { for: 'select', q: item.candidates[0]?.name ?? '' } })} style={styles.searchOther} accessibilityRole="button">
          <Search size={16} color={colors.primary} strokeWidth={2} />
          <T style={styles.searchOtherText}>Search for a different place</T>
        </Pressable>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button label="Use this place" disabled={!chosen} onPress={() => chosen && onUse(chosen)} style={{ flex: 1 }} />
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: space.gutter, paddingTop: 2, paddingBottom: 24, gap: 14 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hairline },
  discard: { alignSelf: 'auto', paddingHorizontal: 20 },
  step: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.onPrimaryContainer, backgroundColor: colors.primaryContainer, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, overflow: 'hidden' },
  field: { gap: 6 },
  optl: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkMuted },
  quote: { backgroundColor: colors.quote, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 12, paddingHorizontal: 14 },
  quoteText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onQuote },
  wish: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceTint, borderRadius: radii.field, paddingVertical: 8, paddingHorizontal: 14 },
  wishText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink },
  captionBox: { gap: 8 },
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, paddingHorizontal: space.sheet, paddingTop: 10, paddingBottom: 36, alignItems: 'center', boxShadow: shadows.sheet },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.hairline, marginBottom: 18 },
  peek: { width: 130, height: 110, marginBottom: -12, zIndex: 2 },
  readCard: { alignSelf: 'stretch', backgroundColor: colors.surfaceTint, borderRadius: radii.surface, padding: 18, paddingBottom: 22 },
  lines: { marginTop: 16, gap: 10 },
  line: { height: 10, borderRadius: 5, backgroundColor: colors.background },
  readSub: { marginTop: 14, fontSize: 13.5 },
  failed: { paddingTop: 24 },
  sitting: { width: 96, height: 120, marginBottom: 10 },
  centerText: { textAlign: 'center' },
  whichLead: { marginHorizontal: space.gutter, marginBottom: 12, fontSize: 14 },
  whichPanel: { marginHorizontal: 14, backgroundColor: colors.surface, borderRadius: radii.panel, boxShadow: shadows.card, overflow: 'hidden' },
  cand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  candDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  searchOther: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 14, marginHorizontal: space.gutter, height: 44, paddingHorizontal: 18, borderRadius: radii.pill, boxShadow: `inset 0px 0px 0px 1.5px ${colors.hairline}` },
  searchOtherText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.primary },
});
