import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

// Native Google Sign-In (Android). The web version later swaps this file for an OAuth redirect (spec §18.3).
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // ID token audience = the web client Supabase checks
  scopes: ['openid', 'email', 'profile'],
});

export type GoogleResult = { kind: 'ok'; idToken: string } | { kind: 'cancelled' } | { kind: 'error'; message: string };

export async function googleSignIn(): Promise<GoogleResult> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return { kind: 'cancelled' };
    if (!res.data.idToken) return { kind: 'error', message: 'Google did not return an ID token' };
    return { kind: 'ok', idToken: res.data.idToken };
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return { kind: 'cancelled' };
    return { kind: 'error', message: isErrorWithCode(e) ? `${e.code}: ${e.message}` : String(e) };
  }
}

export async function googleSignOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device; nothing to do.
  }
}
