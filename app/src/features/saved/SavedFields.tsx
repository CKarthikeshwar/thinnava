import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Calendar, CircleAlert, Globe, MapPin, Search, UserRound, X } from 'lucide-react-native';
import { Avatar, Chip, ChipInput, Pressable, RatingPicker, Segmented, T, TextField, type Rating } from '@/components';
import type { Place } from '@/features/places/api';
import { DateSheet } from '@/features/visits/DateSheet';
import { friendlyDate, todayIST } from '@/lib/dates';
import { colors, fonts, radii, strokes } from '@/theme';
import type { FriendName, SavedKind } from './api';
import { FriendNameSheet, type PickedFriend } from './FriendNameSheet';

export type SavedDraft = {
  kind: SavedKind;
  friend: PickedFriend | null;
  link: string;
  place: Place | null;
  rating: Rating | null;
  loved: string[];
  disliked: string[];
  price: string;
  visitedOn: string | null;
};

export type Flags = Partial<Record<'place' | 'rating' | 'price' | 'visitedOn', boolean>>;

export const emptyDraft = (kind: SavedKind, place: Place | null = null): SavedDraft =>
  ({ kind, friend: null, link: '', place, rating: null, loved: [], disliked: [], price: '', visitedOn: null });

export const priceOk = (price: string) => !price || (Number.isInteger(Number(price)) && Number(price) >= 1 && Number(price) <= 50000);
/** Save needs a place, a friend name for friend entries (spec §6.3) and a sane price. */
export const canSave = (d: SavedDraft) => !!d.place && (d.kind === 'internet' || !!d.friend) && priceOk(d.price);

type Props = {
  value: SavedDraft;
  onChange: (patch: Partial<SavedDraft>) => void;
  names: FriendName[];
  onChangePlace: () => void;
  flags?: Flags;
};

/**
 * The fields shared by D5 (by hand) and D8 (check what we found), spec §6.3–6.4, §10.3:
 * source toggle · Who told you? (friend, required, quick picks) or Link (internet) · Place · How was it for them? ·
 * Loved · Didn't like · Price per person · When they went (friend).
 */
export function SavedFields({ value: d, onChange, names, onChangePlace, flags = {} }: Props) {
  const nameSheet = useRef<BottomSheetModal>(null);
  const dateSheet = useRef<BottomSheetModal>(null);
  const recent = names.slice(0, 3);

  return (
    <>
      <Segmented
        options={[{ key: 'friend', label: 'A friend', icon: UserRound }, { key: 'internet', label: 'Internet', icon: Globe }]}
        value={d.kind}
        onChange={(kind) => onChange({ kind })}
      />

      {d.kind === 'friend' ? (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <T variant="fieldLabel">Who told you?</T>
            {d.friend ? <T style={[styles.badge, styles.badgeDone]}>Done</T> : <T style={[styles.badge, styles.badgeReq]}>Required</T>}
          </View>
          <Pressable onPress={() => nameSheet.current?.present()} pressScale={0.99} style={styles.inp} accessibilityRole="button"
            accessibilityLabel={d.friend ? `Who told you: ${d.friend.name}. Change` : 'Who told you? Type a name'}>
            {d.friend ? (
              <>
                <Avatar name={d.friend.name} size={26} />
                <T style={styles.inpText} numberOfLines={1}>{d.friend.name}</T>
                <T style={styles.change}>Change</T>
              </>
            ) : <T style={[styles.inpText, styles.muted]}>Type a name</T>}
          </Pressable>
          {!d.friend && recent.length ? (
            <View style={styles.sugg}>
              {recent.map((n) => (
                <Chip key={n.id} label={n.name} style={styles.suggChip} onPress={() => onChange({ friend: { id: n.id, name: n.name, isNew: false } })} />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <TextField label="Link" optional value={d.link} onChangeText={(link) => onChange({ link: link.trim().slice(0, 2000) })}
          placeholder="Paste a reel, video or page link" keyboardType="url" autoCapitalize="none" autoCorrect={false} />
      )}

      <View style={styles.field}>
        <T variant="fieldLabel">Place</T>
        <Pressable onPress={onChangePlace} pressScale={0.99} style={[styles.inp, flags.place && styles.warn]} accessibilityRole="button"
          accessibilityLabel={d.place ? `Place: ${d.place.name}. Change` : 'Search places'}>
          {d.place ? (
            <>
              <MapPin size={18} color={colors.primary} strokeWidth={2} />
              <T style={styles.inpText} numberOfLines={1}>{d.place.name}{d.place.area ? `, ${d.place.area}` : ''}</T>
              <T style={styles.change}>Change</T>
            </>
          ) : (
            <>
              <T style={[styles.inpText, styles.muted]}>Search places</T>
              <Search size={18} color={colors.inkMuted} strokeWidth={2} />
            </>
          )}
        </Pressable>
        {flags.place ? <Flag /> : null}
      </View>

      <View style={styles.field}>
        <T variant="fieldLabel">How was it for them?</T>
        <RatingPicker value={d.rating} onChange={(rating) => onChange({ rating })} allowNone />
        {flags.rating ? <Flag /> : null}
      </View>
      <ChipInput label="Loved" value={d.loved} onChange={(loved) => onChange({ loved })} />
      <ChipInput label="Didn't like" optional value={d.disliked} onChange={(disliked) => onChange({ disliked })} />

      <View style={styles.two}>
        <View style={{ flex: 1 }}>
          <TextField label="Price / person" prefix="₹" keyboardType="number-pad" value={d.price} placeholder="300"
            onChangeText={(t) => onChange({ price: t.replace(/[^0-9]/g, '').slice(0, 5) })}
            warn={flags.price}
            status={!priceOk(d.price) ? { kind: 'error', text: '₹1 to ₹50,000' } : null} />
          {flags.price ? <Flag /> : null}
        </View>
        {d.kind === 'friend' ? (
          <View style={[styles.field, { flex: 1 }]}>
            <T variant="fieldLabel">When they went</T>
            <Pressable onPress={() => dateSheet.current?.present()} pressScale={0.99} style={[styles.inp, flags.visitedOn && styles.warn]} accessibilityRole="button"
              accessibilityLabel={d.visitedOn ? `When they went: ${friendlyDate(d.visitedOn)}. Change` : 'When they went: not set'}>
              <Calendar size={18} color={d.visitedOn ? colors.inkSoft : colors.inkMuted} strokeWidth={2} />
              <T style={[styles.inpText, !d.visitedOn && styles.muted]} numberOfLines={1}>{d.visitedOn ? friendlyDate(d.visitedOn) : 'Add'}</T>
              {d.visitedOn ? (
                <Pressable onPress={() => onChange({ visitedOn: null })} hitSlop={10} accessibilityLabel="Clear the date">
                  <X size={16} color={colors.inkMuted} strokeWidth={2.2} />
                </Pressable>
              ) : null}
            </Pressable>
            {flags.visitedOn ? <Flag /> : null}
          </View>
        ) : <View style={{ flex: 1 }} />}
      </View>

      <FriendNameSheet ref={nameSheet} names={names} onPick={(friend) => onChange({ friend })} />
      <DateSheet ref={dateSheet} value={d.visitedOn ?? todayIST()} onPick={(visitedOn) => onChange({ visitedOn })} />
    </>
  );
}

/** Amber "Please check this" under a low-confidence field (spec §10.3). */
function Flag() {
  return (
    <View style={styles.flag}>
      <CircleAlert size={15} color={colors.okayish} strokeWidth={2.2} />
      <T style={styles.flagText}>Please check this</T>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { fontFamily: fonts.bodyHeavy, fontSize: 11.5, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  badgeReq: { color: colors.bad, backgroundColor: colors.badWash },
  badgeDone: { color: colors.good, backgroundColor: colors.goodWash },
  inp: { height: 54, borderRadius: radii.field, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, boxShadow: strokes.field },
  warn: { boxShadow: `inset 0px 0px 0px 2px ${colors.check}` },
  inpText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  muted: { color: colors.inkMuted },
  change: { fontFamily: fonts.bodyHeavy, fontSize: 13.5, color: colors.primary },
  sugg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggChip: { height: 30 },
  two: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flagText: { fontFamily: fonts.bodyHeavy, fontSize: 12.5, color: colors.okayish },
});
