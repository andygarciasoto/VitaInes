import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// ─── Data Retention: Delete readings older than 2 years ──────────────────────
// Runs daily at midnight UTC
export const cleanExpiredReadings = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const expiredRef = db
      .collection('readings')
      .where('clientTimestamp', '<', admin.firestore.Timestamp.fromDate(twoYearsAgo));

    const snapshot = await expiredRef.get();
    if (snapshot.empty) {
      functions.logger.info('No expired readings found.');
      return null;
    }

    // Delete in batches of 500
    const batches: admin.firestore.WriteBatch[] = [];
    let batch = db.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
      if (count % 500 === 0) {
        batches.push(batch);
        batch = db.batch();
      }
    });

    if (count % 500 !== 0) batches.push(batch);

    await Promise.all(batches.map((b) => b.commit()));
    functions.logger.info(`Deleted ${count} expired readings.`);
    return null;
  });

// ─── Trigger: Analyze reading on create ──────────────────────────────────────
export const onReadingCreated = functions.firestore
  .document('readings/{readingId}')
  .onCreate(async (snap, context) => {
    const reading = snap.data();
    const { userId, systolic, diastolic } = reading;

    if (!userId || !systolic || !diastolic) return null;

    // Determine status
    let status = 'normal';
    if (systolic >= 180 || diastolic >= 120) status = 'crisis';
    else if (systolic >= 140 || diastolic >= 90) status = 'high';
    else if (systolic >= 130 || diastolic >= 80) status = 'elevated';

    // Store AI recommendation trigger in Firestore
    const recRef = db.collection('ai_recommendations').doc();
    await recRef.set({
      userId,
      readingId: snap.id,
      readingStatus: status,
      systolic,
      diastolic,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });

    // Send push notification for high/crisis readings
    if (status === 'high' || status === 'crisis') {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;
      const lang = userData?.language || 'en';

      if (fcmToken) {
        const isCrisis = status === 'crisis';
        const titles: Record<string, string> = {
          en: isCrisis ? 'Urgent: Very high blood pressure' : 'High blood pressure alert',
          es: isCrisis ? 'Urgente: Presión arterial muy alta' : 'Alerta de presión arterial alta',
        };
        const bodies: Record<string, string> = {
          en: `Your reading of ${systolic}/${diastolic} mmHg ${isCrisis ? 'requires immediate medical attention' : 'is high. Consider contacting your doctor'}.`,
          es: `Tu lectura de ${systolic}/${diastolic} mmHg ${isCrisis ? 'requiere atención médica inmediata' : 'está alta. Considera contactar a tu médico'}.`,
        };

        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: titles[lang] || titles.en,
            body: bodies[lang] || bodies.en,
          },
          data: {
            type: isCrisis ? 'crisis_alert' : 'high_bp_alert',
            systolic: String(systolic),
            diastolic: String(diastolic),
          },
          android: { priority: 'high', notification: { channelId: 'alerts' } },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });
      }
    }

    functions.logger.info(`Processed reading ${snap.id} for user ${userId} — status: ${status}`);
    return null;
  });

// ─── Trigger: Clean user data on account deletion ────────────────────────────
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;
  const collections = ['readings', 'medications', 'ai_recommendations'];

  await Promise.all(
    collections.map(async (col) => {
      const snapshot = await db.collection(col).where('userId', '==', userId).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    })
  );

  // Delete user document
  await db.collection('users').doc(userId).delete();
  functions.logger.info(`Deleted all data for user ${userId}`);
});

// ─── HTTP: Get user statistics ────────────────────────────────────────────────
export const getUserStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const userId = context.auth.uid;
  const days = data.days || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const snapshot = await db
    .collection('readings')
    .where('userId', '==', userId)
    .where('clientTimestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
    .orderBy('clientTimestamp', 'desc')
    .get();

  const readings = snapshot.docs.map((doc) => doc.data());

  if (readings.length === 0) {
    return { count: 0, avgSystolic: 0, avgDiastolic: 0 };
  }

  const avgSystolic = Math.round(
    readings.reduce((s, r) => s + r.systolic, 0) / readings.length
  );
  const avgDiastolic = Math.round(
    readings.reduce((s, r) => s + r.diastolic, 0) / readings.length
  );
  const maxSystolic = Math.max(...readings.map((r) => r.systolic));
  const minSystolic = Math.min(...readings.map((r) => r.systolic));

  return {
    count: readings.length,
    avgSystolic,
    avgDiastolic,
    maxSystolic,
    minSystolic,
    days,
  };
});
