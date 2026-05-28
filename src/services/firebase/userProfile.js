import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const USERS_COLLECTION = 'users';

export const updateUserProfile = async (userId, updates) => {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const getUserProfile = async (userId) => {
  const docSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};

export const completeOnboarding = async (userId, onboardingData = {}) => {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    onboardingComplete: true,
    ...onboardingData,
    updatedAt: serverTimestamp(),
  });
};

export const updateLanguage = async (userId, language) => {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    language,
    updatedAt: serverTimestamp(),
  });
};
