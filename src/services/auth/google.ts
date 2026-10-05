import { GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut, getIdToken } from '@react-native-firebase/auth';
import { GOOGLE_WEB_CLIENT_ID } from '@env';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
  configured = true;
}

/**
 * Native Google Sign-In → Firebase Auth → a Firebase ID token (what the backend verifies via
 * firebase-admin, not the raw Google token). Resolves null if the user cancelled the account
 * picker. Throws on real failures.
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  ensureConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const googleIdToken = response.data.idToken;
    if (!googleIdToken) throw new Error('Google Sign-In did not return an ID token');

    const credential = GoogleAuthProvider.credential(googleIdToken);
    const userCredential = await signInWithCredential(getAuth(), credential);
    return getIdToken(userCredential.user);
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) {
      return null;
    }
    throw e;
  }
}

/**
 * Logout: clears Google's own cached native session and Firebase Auth's persisted session, not
 * just this app's local profile/tokens. Without this, the next getFirebaseIdToken() call silently
 * re-authenticates the same account (no account picker shown) because both SDKs still think the
 * user is signed in.
 */
export async function signOutGoogle(): Promise<void> {
  ensureConfigured();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in at the native level, or Play Services unavailable — nothing to clear.
  }
  try {
    await firebaseSignOut(getAuth());
  } catch {
    // No current Firebase user — nothing to clear.
  }
}
