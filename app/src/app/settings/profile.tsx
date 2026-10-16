import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, T, TopBar, showSnack } from '@/components';
import { fetchMyProfile, updateProfile } from '@/features/auth/api';
import { ProfileForm } from '@/features/auth/ProfileForm';
import { useAuth } from '@/features/auth/session';
import { colors, space } from '@/theme';

/** F3 Edit profile (spec §14): same fields and live username check as set-up. */
export default function EditProfile() {
  const profile = useAuth((s) => s.profile);
  if (!profile) return null;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar close title="Edit profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.photo}>
            <Avatar name={profile.display_name} uri={profile.avatar_url} size={84} />
            <T variant="meta">Photo comes from your Google account</T>
          </View>
          <ProfileForm
            initial={{ name: profile.display_name, username: profile.username, bio: profile.bio ?? '' }}
            ownUsername={profile.username}
            submitLabel="Save"
            onSubmit={async (v) => {
              await updateProfile(v.username, v.name, v.bio || null);
              useAuth.getState().setProfile(await fetchMyProfile());
              showSnack({ text: 'Saved' });
              router.back();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flexGrow: 1, paddingHorizontal: space.gutter, paddingBottom: 24, gap: 18 },
  photo: { alignItems: 'center', gap: 8, marginTop: 6 },
});
