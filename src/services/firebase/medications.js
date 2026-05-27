import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const MEDS_COLLECTION = 'medications';

export const addMedication = async (userId, medication) => {
  const docRef = await addDoc(collection(db, MEDS_COLLECTION), {
    userId,
    name: medication.name,
    dosage: medication.dosage,
    frequency: medication.frequency,
    doctorNotes: medication.doctorNotes || '',
    category: medication.category || '',
    active: true,
    reminderTimes: medication.reminderTimes || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getMedications = async (userId) => {
  const q = query(
    collection(db, MEDS_COLLECTION),
    where('userId', '==', userId),
    limit(200)
  );

  const snapshot = await getDocs(q);
  const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  results.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return aTime - bTime;
  });
  return results;
};

export const updateMedication = async (medId, updates) => {
  await updateDoc(doc(db, MEDS_COLLECTION, medId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const toggleMedication = async (medId, active) => {
  await updateDoc(doc(db, MEDS_COLLECTION, medId), {
    active,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMedication = async (medId) => {
  await deleteDoc(doc(db, MEDS_COLLECTION, medId));
};
