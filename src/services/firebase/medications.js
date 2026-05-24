import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
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
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
