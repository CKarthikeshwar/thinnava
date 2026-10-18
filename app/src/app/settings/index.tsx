import { useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ban, Bell, ChevronRight, CloudOff, FileText, List, LogOut, MessageCircle, Trash2, UserRound, UsersRound, type LucideProps } from 'lucide-react-native';
import { Avatar, Button, Dialog, Panel, Pressable, Screen, T, TopBar, showSnack } from '@/components';
import { signOut } from '@/features/auth/api';
import { useDraftCount, useOutbox } from '@/lib/outbox';
import { useDrafts } from '@/lib/drafts';
import { IS_WEB } from '@/lib/layout';
import { hasNotificationSettings, openNotificationSettings } from '@/platform/settings/notifications';
import { useAuth } from '@/features/auth/session';
import { colors, fonts, shadows } from '@/theme';

type Row = { icon: ComponentType<LucideProps>; label: string; onPress: () => void; danger?: boolean; count?: number };

/** F2 Settings (spec §14). Rows for later milestones say so instead of being hidden. */
export default function Settings() {
  const profile = useAuth((s) => s.profile);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const drafts = useDraftCount();
  // Queued and draft changes are cleared on sign-out (spec §26.3), so say so first.
  const unsynced = useOutbox((s) => s.ops.length) + useDrafts((s) => s.drafts.length);

  const groups: Row[][] = [
    [
      { icon: UsersRound, label: 'Connections', onPress: () => router.push('/connections') },
      { icon: List, label: 'My lists', onPress: () => router.push('/lists' as Href) },
      { icon: Ban, label: 'Blocked people', onPress: () => router.push('/settings/blocked') },
    ],
    [
      { icon: MessageCircle, label: 'Friend names', onPress: () => router.push('/settings/friend-names') },
      { icon: UserRound, label: 'Private companion names', onPress: () => router.push('/settings/companion-names') },
      // Offline saving isn't on the web yet (spec §18.3), so no drafts row there.
      ...(IS_WEB ? [] : [{ icon: CloudOff, label: 'Offline drafts', onPress: () => router.push('/settings/drafts'), count: drafts }]),
    ],
    [
      ...(hasNotificationSettings ? [{ icon: Bell, label: 'Notifications', onPress: openNotificationSettings }] : []),
      { icon: FileText, label: 'About & privacy', onPress: () => router.push('/settings/about') },
      { icon: LogOut, label: 'Sign out', onPress: () => setConfirmSignOut(true) },
      { icon: Trash2, label: 'Delete account', onPress: () => router.push('/settings/delete-account'), danger: true },
    ],
  ];

  return (
    <Screen header={<TopBar title="Settings" onBack={() => router.back()} />} contentStyle={styles.body}>
      <View style={styles.me}>
        <Avatar name={profile?.display_name ?? '?'} uri={profile?.avatar_url} size={56} />
        <View style={{ flex: 1 }}>
          <T style={styles.meName} numberOfLines={1}>{profile?.display_name ?? ''}</T>
          <T variant="meta" numberOfLines={1}>{profile ? `@${profile.username}` : ''}</T>
        </View>
        <Button label="Edit" variant="tonal" small onPress={() => router.push('/settings/profile')} style={styles.edit} />
      </View>
      {groups.map((g, i) => (
        <Panel key={i} style={styles.group}>
          {g.map((r, j) => (
            <Pressable key={r.label} onPress={r.onPress} pressScale={0.99} style={[styles.row, j > 0 && styles.divider]} accessibilityRole="button" accessibilityLabel={r.label}>
              <View style={[styles.icon, r.danger && { backgroundColor: colors.badWash }]}>
                <r.icon size={18} color={r.danger ? colors.bad : colors.primaryStrong} strokeWidth={2} />
              </View>
              <T style={[styles.rowText, r.danger && { color: colors.bad }]}>{r.label}</T>
              {r.count ? <View style={styles.count}><T style={styles.countText}>{r.count}</T></View> : null}
              {r.label !== 'Sign out' ? <ChevronRight size={18} color={colors.inkMuted} strokeWidth={2} /> : null}
            </Pressable>
          ))}
        </Panel>
      ))}
      <Dialog
        visible={confirmSignOut}
        icon={LogOut}
        title="Sign out?"
        body={unsynced ? `${unsynced} ${unsynced === 1 ? "change hasn't" : "changes haven't"} synced yet and will be lost. You can sign back in with Google any time.` : 'You can sign back in with Google any time.'}
        confirmLabel="Sign out"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={async () => { setConfirmSignOut(false); await signOut(); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 4 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4, paddingBottom: 16, paddingHorizontal: 18 },
  meName: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  edit: { height: 36, alignSelf: 'center' },
  group: { marginHorizontal: 16, marginBottom: 12, borderRadius: 22, boxShadow: shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.onPrimary },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
});
