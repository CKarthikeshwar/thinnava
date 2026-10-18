import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AlertCircle, CloudUpload, MapPin, MessageSquareText, RotateCw, Trash2 } from 'lucide-react-native';
import { Button, EmptyState, IconButton, ListSurface, Screen, SectionLabel, T, TopBar, showSnack } from '@/components';
import { useTakePicked } from '@/features/places/picked';
import { rememberPlace } from '@/features/places/api';
import { removeDraft, removePendingShare, useDrafts, type Draft } from '@/lib/drafts';
import { dropOp, retryOp, runWrite, useOutbox } from '@/lib/outbox';
import { useNet } from '@/lib/net';
import { friendlyError } from '@/lib/errors';
import { timeAgo } from '@/lib/dates';
import { colors, space } from '@/theme';

/**
 * F6 Offline drafts (spec §14, §13, §26.5): Waiting to sync (automatic) · Needs a place (tap → D1 with the typed name)
 * · Waiting for internet (shared or copied messages) · Couldn't sync (the error, Retry / Delete).
 */
export default function Drafts() {
  const ops = useOutbox((s) => s.ops);
  const { drafts, shares } = useDrafts();
  const online = useNet((s) => s.online);
  const [placing, setPlacing] = useState<Draft | null>(null);

  // A draft gets its real place: swap the stand-in id, then it becomes a normal (maybe queued) save.
  useTakePicked(async (place) => {
    const d = placing;
    setPlacing(null);
    if (!d) return;
    const p = { ...(d.args.p as Record<string, unknown>), place_id: place.placeId };
    try {
      rememberPlace({ placeId: place.placeId, name: place.name, area: place.area });
      const r = await runWrite(d.kind, { ...d.args, p }, d.label.replace(d.placeName, place.name));
      removeDraft(d.id);
      showSnack({ text: r.queued ? "Place added · it'll sync when you're online" : 'Place added · saved' });
    } catch (e) { showSnack({ text: friendlyError(e) }); }
  }, 'draft');

  const queued = ops.filter((o) => o.state === 'queued');
  const failed = ops.filter((o) => o.state === 'failed');
  const nothing = !queued.length && !failed.length && !drafts.length && !shares.length;

  return (
    <Screen header={<TopBar title="Offline drafts" onBack={() => router.back()} />} scroll={!nothing}>
      {nothing ? (
        <View style={{ paddingTop: 20 }}>
          <EmptyState title="All synced" body="Things you save offline wait here until they reach Thinnava." />
        </View>
      ) : (
        <ListSurface style={styles.surface}>
          {queued.length ? <SectionLabel>Waiting to sync</SectionLabel> : null}
          {queued.map((o) => (
            <Row key={o.opId} icon={<CloudUpload size={20} color={colors.primaryStrong} strokeWidth={2} />} title={o.label}
              sub={online ? 'Sending…' : `Saved ${timeAgo(o.createdAt)} ago · sends when you're online`} />
          ))}

          {drafts.length ? <SectionLabel>Needs a place</SectionLabel> : null}
          {drafts.map((d) => (
            <Row key={d.id} icon={<MapPin size={20} color={colors.primaryStrong} strokeWidth={2} />} title={d.label}
              sub={`You typed "${d.placeName}". Only on this phone until you pick the place.`}
              actions={<>
                <Button label="Pick the place" small onPress={() => { setPlacing(d); router.push({ pathname: '/pick-place', params: { for: 'draft', q: d.placeName } }); }} />
                <IconButton icon={Trash2} label="Delete draft" ghost onPress={() => { removeDraft(d.id); showSnack({ text: 'Draft deleted' }); }} />
              </>} />
          ))}

          {shares.length ? <SectionLabel>Waiting for internet</SectionLabel> : null}
          {shares.map((s) => (
            <Row key={s.id} icon={<MessageSquareText size={20} color={colors.primaryStrong} strokeWidth={2} />} title={s.text.split('\n')[0].slice(0, 80)}
              sub={online ? 'Ready to read' : "We'll read it when you're online"}
              actions={<>
                {online ? <Button label="Review" small onPress={() => { removePendingShare(s.id); router.push({ pathname: '/import', params: { text: s.text } }); }} /> : null}
                <IconButton icon={Trash2} label="Delete message" ghost onPress={() => { removePendingShare(s.id); showSnack({ text: 'Message deleted' }); }} />
              </>} />
          ))}

          {failed.length ? <SectionLabel>Couldn't sync</SectionLabel> : null}
          {failed.map((o) => (
            <Row key={o.opId} icon={<AlertCircle size={20} color={colors.bad} strokeWidth={2} />} title={o.label}
              sub={friendlyError({ message: o.error }, o.error ?? 'Something went wrong.')}
              actions={<>
                <Button label="Retry" small variant="tonal" icon={RotateCw} onPress={() => retryOp(o.opId)} />
                <IconButton icon={Trash2} label="Delete" ghost onPress={() => { dropOp(o.opId); showSnack({ text: 'Deleted' }); }} />
              </>} />
          ))}
        </ListSurface>
      )}
    </Screen>
  );
}

function Row({ icon, title, sub, actions }: { icon: ReactNode; title: string; sub: string; actions?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="bodyStrong" numberOfLines={2}>{title}</T>
        <T variant="meta">{sub}</T>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { paddingTop: 4, paddingBottom: 16, minHeight: 400 },
  row: { flexDirection: 'row', gap: 14, paddingVertical: 10, paddingHorizontal: space.gutter, alignItems: 'flex-start' },
  mark: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
});
