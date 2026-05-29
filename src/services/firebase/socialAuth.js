import {
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

export const ensureUserDoc = async (user) => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
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
  return (await getDoc(ref)).data();
};

// Called after expo-auth-session returns a Google idToken.
// Works on iOS, Android, and web — no platform guard needed.
export const signInWithGoogleCredential = async (idToken) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  // Fire-and-forget — don't block sign-in on Firestore
  ensureUserDoc(result.user).catch((err) =>
    console.warn('[socialAuth] ensureUserDoc failed:', err)
  );
  return result.user;
};
