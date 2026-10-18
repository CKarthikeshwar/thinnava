import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Pressable, T, showSnack } from '@/components';
import { NOTIF_KEYS, type Notif } from './api';
import { respondRequest } from '@/features/people/api';
import { openPerson, useRefreshPeople } from '@/features/people/components';
import { timeAgo } from '@/lib/dates';
import { friendlyError } from '@/lib/errors';
import { colors, fonts, space } from '@/theme';

/** Accept / Decline a connect request from a notification row, then refresh everything it touches. */
export function useAnswerRequest() {
  const qc = useQueryClient();
  const refreshPeople = useRefreshPeople();
  const [busy, setBusy] = useState<string | null>(null);
  const answer = async (n: Notif, accept: boolean) => {
    if (!n.actor_id) return;
    setBusy(n.id);
    try {
      await respondRequest(n.actor_id, accept);
      await Promise.all([...NOTIF_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })), refreshPeople()]);
      if (!accept) showSnack({ text: 'Request declined' });
    } catch (e) { showSnack({ text: friendlyError(e) }); }
    setBusy(null);
  };
  return { busy, answer };
}

/** One F1 row (spec §12): text, inline Accept / Decline or Add your review, time. */
export function NotifRow({ n, busy, onAnswer }: { n: Notif; busy: boolean; onAnswer: (accept: boolean) => void }) {
  const who = (n.actor_name ?? 'Someone').split(' ')[0];
  const B = ({ children }: { children: string }) => <T style={rowStyles.b}>{children}</T>;
  const text = {
    connect_request: <>{<B>{who}</B>} wants to connect</>,
    connect_accepted: <>{<B>{who}</B>} accepted your request</>,
    tag_request: <>{<B>{who}</B>} tagged you at {<B>{n.place_name ?? 'a place'}</B>}</>,
    connection_visited: <>{<B>{who}</B>} visited {<B>{n.place_name ?? 'a place'}</B>}</>,
    wishlist_visited: <>{<B>{who}</B>} visited {<B>{n.place_name ?? 'a place'}</B>}, a place on your wishlist</>,
  }[n.type];
  // Tap targets (§12): request → their profile · accepted → their profile · tag → E8 · activity → C2.
  const open = () => {
    if (n.type === 'tag_request' && n.tag_id) return router.push({ pathname: '/tag/[tagId]', params: { tagId: n.tag_id } });
    if ((n.type === 'connection_visited' || n.type === 'wishlist_visited') && n.visit_id) return router.push({ pathname: '/entry/[type]/[id]', params: { type: 'visit', id: n.visit_id } });
    if (n.actor_id) openPerson(n.actor_id);
  };
  const pendingRequest = n.type === 'connect_request' && n.actor_relation === 'incoming';
  const pendingTag = n.type === 'tag_request' && n.tag_status === 'pending';
  return (
    <Pressable onPress={open} pressScale={0.99} style={[rowStyles.row, !n.read && rowStyles.unread]} accessibilityRole="button">
      <Avatar name={n.actor_name ?? '?'} uri={n.actor_avatar} />
      <View style={{ flex: 1 }}>
        <T style={rowStyles.text}>{text}</T>
        {pendingRequest ? (
          <View style={rowStyles.acts}>
            <Button label={busy ? '…' : 'Accept'} small style={rowStyles.btn} onPress={() => onAnswer(true)} />
            <Button label="Decline" variant="outline" small style={rowStyles.btn} onPress={() => onAnswer(false)} />
          </View>
        ) : null}
        {pendingTag ? (
          <View style={rowStyles.acts}>
            <Button label="Add your review" variant="tonal" small style={rowStyles.btn} onPress={open} />
          </View>
        ) : null}
      </View>
      <T style={rowStyles.time}>{timeAgo(n.created_at)}</T>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: space.gutter, alignItems: 'flex-start' },
  unread: { backgroundColor: colors.surfaceTint },
  text: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, color: colors.inkSoft },
  b: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, lineHeight: 20, color: colors.ink },
  acts: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { height: 34, alignSelf: 'auto' },
  time: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkMuted },
});
