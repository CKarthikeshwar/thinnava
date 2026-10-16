import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CatPeek, T } from '@/components';
import { createProfile, updateProfile } from '@/features/auth/api';
import { ProfileForm } from '@/features/auth/ProfileForm';
import { useAuth } from '@/features/auth/session';
import { colors, radii } from '@/theme';

/** A3 Set up profile (spec §14): name from Google, username with the live check, optional bio. */
export default function Setup() {
  const session = useAuth((s) => s.session);
  const meta = session?.user.user_metadata ?? {};
  const googleName = String(meta.full_name ?? meta.name ?? '').slice(0, 40);
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ marginTop: 18 }}><CatPeek width={150} /></View>
          <View style={styles.sheet}>
            <View style={{ gap: 6 }}>
              <T variant="headline" accessibilityRole="header">Set up your profile</T>
              <T variant="body">This is how friends find you.</T>
            </View>
            <ProfileForm
              initial={{ name: googleName, username: '', bio: '' }}
              submitLabel="Let's eat"
              onSubmit={async (v) => {
                await createProfile(v.username, v.name);
                // Bio lives in profile_details; save it right after the profile exists.
                if (v.bio) await updateProfile(v.username, v.name, v.bio);
                await useAuth.getState().refresh(); // → ready → the gate shows Home
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  sheet: { flexGrow: 1, backgroundColor: colors.surface, borderTopLeftRadius: radii.hero, borderTopRightRadius: radii.hero, paddingTop: 36, paddingHorizontal: 22, paddingBottom: 26, gap: 18, boxShadow: '0px -10px 30px -20px rgba(20,30,50,0.3)' },
});
