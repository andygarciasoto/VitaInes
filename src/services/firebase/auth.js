import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

export const signUp = async (email, password, displayName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Create user document — fire-and-forget so a Firestore error can't block sign-in
  setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    email,
    displayName,
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
  }).catch((err) => console.warn('[auth] Firestore profile create failed:', err));

  return credential.user;
};

export const signIn = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signOut = async () => {
  await firebaseSignOut(auth);
};

export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

export const getUserProfile = async (uid) => {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};

export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};
