import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
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

export const googleSignIn = async () => {
  if (Platform.OS !== 'web') {
    throw new Error('NATIVE_NOT_CONFIGURED');
  }
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(result.user);
  return result.user;
};

export const appleSignInWeb = async () => {
  if (Platform.OS !== 'web') {
    throw new Error('NATIVE_NOT_CONFIGURED');
  }
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(result.user);
  return result.user;
};

export const signInWithGoogleCredential = async (idToken) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await ensureUserDoc(result.user);
  return result.user;
};
