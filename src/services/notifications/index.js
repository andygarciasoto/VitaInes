import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'VitaInes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF93',
    });

    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Health Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#E74C3C',
    });
  }

  return true;
};

export const scheduleBloodPressureReminder = async (window, language = 'en') => {
  const titles = {
    en: 'Time to check your blood pressure',
    es: 'Es hora de revisar tu presión arterial',
  };
  const bodies = {
    en: 'Take a moment to log your reading.',
    es: 'Tómate un momento para registrar tu lectura.',
  };

  // Schedule a notification randomly within the time window
  const [startHour] = window.start.split(':').map(Number);
  const [endHour] = window.end.split(':').map(Number);
  const randomHour = startHour + Math.floor(Math.random() * (endHour - startHour));
  const randomMinute = Math.floor(Math.random() * 60);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[language] || titles.en,
      body: bodies[language] || bodies.en,
      data: { type: 'bp_reminder' },
      sound: true,
    },
    trigger: {
      hour: randomHour,
      minute: randomMinute,
      repeats: true,
    },
  });
};

export const scheduleMedicationReminder = async (medication, times, language = 'en') => {
  const titleTemplate = language === 'es' ? 'Recordatorio de medicamento' : 'Medication reminder';
  const bodyTemplate = language === 'es'
    ? `Es hora de tomar tu ${medication.name} (${medication.dosage})`
    : `Time to take your ${medication.name} (${medication.dosage})`;

  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titleTemplate,
        body: bodyTemplate,
        data: { type: 'medication_reminder', medicationId: medication.id },
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }
};

export const sendElevatedBPAlert = async (systolic, diastolic, language = 'en') => {
  const isSpanish = language === 'es';
  const isCrisis = systolic >= 180 || diastolic >= 120;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isCrisis
        ? (isSpanish ? 'Urgente: Presión arterial muy alta' : 'Urgent: Very high blood pressure')
        : (isSpanish ? 'Alerta de presión arterial alta' : 'High blood pressure alert'),
      body: isSpanish
        ? `Tu lectura de ${systolic}/${diastolic} mmHg ${isCrisis ? 'requiere atención médica inmediata' : 'está alta. Considera contactar a tu médico'}.`
        : `Your reading of ${systolic}/${diastolic} mmHg ${isCrisis ? 'requires immediate medical attention' : 'is high. Consider contacting your doctor'}.`,
      data: { type: isCrisis ? 'crisis_alert' : 'high_bp_alert', systolic, diastolic },
      sound: true,
      channelId: 'alerts',
    },
    trigger: null, // Immediate
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const cancelNotificationsByType = async (type) => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === type) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
};
