import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import * as Crypto from 'expo-crypto';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

// Ensures a Firestore user document exists. Accepts an optional displayName
// override (used for Apple Sign-In which only provides the name on first login).
export const ensureUserDoc = async (user, displayNameOverride) => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const displayName = displayNameOverride || user.displayName || '';
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      displayName,
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      language: 'en',
      onboardingComplete: false,
      measurementsPerDay: 1,
      reminderWindows: [],
      targetSystolic: 120,
      targetDiastolic: 80,
      doctorName: '',
      doctorPhone: '',
      emergencyContact: '',
    });
  }
  const updated = await getDoc(ref);
  return updated.data();
};

// ─── Google ──────────────────────────────────────────────────────────────────

// Called after expo-auth-session returns a Google idToken.
export const signInWithGoogleCredential = async (idToken) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  ensureUserDoc(result.user).catch((err) =>
    console.warn('[socialAuth] Google ensureUserDoc failed:', err)
  );
  return result.user;
};

// ─── Apple ───────────────────────────────────────────────────────────────────

// Generates a cryptographically random nonce and its SHA-256 hash.
// The raw nonce goes to Firebase; the hashed nonce goes to Apple.
export const generateNonce = async () => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const rawNonce = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  return { rawNonce, hashedNonce };
};

// Called with the result of AppleAuthentication.signInAsync().
export const signInWithAppleCredential = async (identityToken, rawNonce, fullName) => {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce });
  const result = await signInWithCredential(auth, credential);

  // Apple only provides fullName on the very first sign-in — capture it then.
  const displayName = fullName
    ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() || null
    : null;

  ensureUserDoc(result.user, displayName).catch((err) =>
    console.warn('[socialAuth] Apple ensureUserDoc failed:', err)
  );
  return result.user;
};
