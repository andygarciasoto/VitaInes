import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { subYears } from 'date-fns';

const READINGS_COLLECTION = 'readings';

export const addReading = async (userId, reading) => {
  const docRef = await addDoc(collection(db, READINGS_COLLECTION), {
    userId,
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    pulse: reading.pulse || null,
    notes: reading.notes || '',
    timestamp: serverTimestamp(),
    clientTimestamp: Timestamp.fromDate(reading.date || new Date()),
    // Auto-delete marker: readings older than 2 years will be cleaned up by Cloud Function
    expiresAt: Timestamp.fromDate(subYears(reading.date || new Date(), -2)),
  });
  return docRef.id;
};

export const getReadings = async (userId, startDate, endDate) => {
  const q = query(
    collection(db, READINGS_COLLECTION),
    where('userId', '==', userId),
    where('clientTimestamp', '>=', Timestamp.fromDate(startDate)),
    where('clientTimestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('clientTimestamp', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    timestamp: d.data().clientTimestamp?.toDate() || new Date(),
  }));
};

export const getRecentReadings = async (userId, count = 10) => {
  const q = query(
    collection(db, READINGS_COLLECTION),
    where('userId', '==', userId),
    orderBy('clientTimestamp', 'desc'),
    limit(count)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    timestamp: d.data().clientTimestamp?.toDate() || new Date(),
  }));
};

export const getLatestReading = async (userId) => {
  const readings = await getRecentReadings(userId, 1);
  return readings.length > 0 ? readings[0] : null;
};

export const updateReading = async (readingId, updates) => {
  await updateDoc(doc(db, READINGS_COLLECTION, readingId), updates);
};

export const deleteReading = async (readingId) => {
  await deleteDoc(doc(db, READINGS_COLLECTION, readingId));
};

export const getReadingStats = async (userId, startDate, endDate) => {
  const readings = await getReadings(userId, startDate, endDate);

  if (readings.length === 0) {
    return { count: 0, avgSystolic: 0, avgDiastolic: 0, maxSystolic: 0, minSystolic: 0 };
  }

  const systolicValues = readings.map((r) => r.systolic);
  const diastolicValues = readings.map((r) => r.diastolic);

  return {
    count: readings.length,
    avgSystolic: Math.round(systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length),
    avgDiastolic: Math.round(diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length),
    maxSystolic: Math.max(...systolicValues),
    minSystolic: Math.min(...systolicValues),
    maxDiastolic: Math.max(...diastolicValues),
    minDiastolic: Math.min(...diastolicValues),
    readings,
  };
};
