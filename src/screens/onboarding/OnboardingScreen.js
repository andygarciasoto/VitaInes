import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import { useApp } from '../../store/AppContext';
import { completeOnboarding } from '../../services/firebase/userProfile';
import { addMedication } from '../../services/firebase/medications';
import {
  requestNotificationPermissions,
  scheduleBloodPressureReminder,
} from '../../services/notifications';
import MedicationForm from '../medications/MedicationForm';

const TOTAL_STEPS = 3;

const REMINDER_WINDOWS = [
  { key: 'morning', start: '07:00', end: '09:00' },
  { key: 'afternoon', start: '13:00', end: '15:00' },
  { key: 'evening', start: '19:00', end: '21:00' },
];

const OnboardingScreen = () => {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [step, setStep] = useState(1);
  const [measurementsPerDay, setMeasurementsPerDay] = useState(1);
  const [selectedWindows, setSelectedWindows] = useState(['morning']);
  const [medications, setMedications] = useState([]);
  const [showMedForm, setShowMedForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleWindow = (key) => {
    setSelectedWindows((prev) =>
      prev.includes(key) ? prev.filter((w) => w !== key) : [...prev, key]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      // Ensure selected windows match measurements per day
      const needed = measurementsPerDay;
      if (selectedWindows.length < needed) {
        setSelectedWindows(REMINDER_WINDOWS.slice(0, needed).map((w) => w.key));
      }
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleFinish = async () => {
    if (!state.user) return;
    setLoading(true);
    try {
      const windows = REMINDER_WINDOWS.filter((w) => selectedWindows.includes(w.key));

      await completeOnboarding(state.user.uid, {
        measurementsPerDay,
        reminderWindows: windows,
      });

      // Set up notifications
      const granted = await requestNotificationPermissions();
      if (granted) {
        for (const window of windows) {
          await scheduleBloodPressureReminder(window, state.language);
        }
      }

      // Save medications
      for (const med of medications) {
        await addMedication(state.user.uid, med);
      }
    } catch (error) {
      Alert.alert('Error', t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressDot, i < step && styles.progressDotActive]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>📊</Text>
      <Text style={styles.stepTitle}>{t('onboarding.step1_title')}</Text>
      <Text style={styles.stepSubtitle}>{t('onboarding.step1_subtitle')}</Text>

      {[
        { value: 1, label: t('onboarding.once_daily'), icon: '🌅' },
        { value: 2, label: t('onboarding.twice_daily'), icon: '☀️' },
        { value: 3, label: t('onboarding.three_times'), icon: '🌟' },
      ].map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.optionCard, measurementsPerDay === option.value && styles.optionCardSelected]}
          onPress={() => setMeasurementsPerDay(option.value)}
          activeOpacity={0.8}
        >
          <Text style={styles.optionIcon}>{option.icon}</Text>
          <Text style={[styles.optionLabel, measurementsPerDay === option.value && styles.optionLabelSelected]}>
            {option.label}
          </Text>
          <View style={[styles.radio, measurementsPerDay === option.value && styles.radioSelected]}>
            {measurementsPerDay === option.value && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>⏰</Text>
      <Text style={styles.stepTitle}>{t('onboarding.step2_title')}</Text>
      <Text style={styles.stepSubtitle}>{t('onboarding.step2_subtitle')}</Text>

      {REMINDER_WINDOWS.map((window) => (
        <TouchableOpacity
          key={window.key}
          style={[styles.optionCard, selectedWindows.includes(window.key) && styles.optionCardSelected]}
          onPress={() => toggleWindow(window.key)}
          activeOpacity={0.8}
        >
          <Text style={styles.optionIcon}>
            {window.key === 'morning' ? '🌅' : window.key === 'afternoon' ? '☀️' : '🌙'}
          </Text>
          <View style={styles.optionTextGroup}>
            <Text style={[styles.optionLabel, selectedWindows.includes(window.key) && styles.optionLabelSelected]}>
              {t(`onboarding.${window.key}`)}
            </Text>
            <Text style={styles.optionSub}>{t(`onboarding.${window.key}_range`)}</Text>
          </View>
          <View style={[styles.checkbox, selectedWindows.includes(window.key) && styles.checkboxSelected]}>
            {selectedWindows.includes(window.key) && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.stepContent}>
        <Text style={styles.stepEmoji}>💊</Text>
        <Text style={styles.stepTitle}>{t('onboarding.step3_title')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.step3_subtitle')}</Text>

        {medications.map((med, idx) => (
          <View key={idx} style={styles.medChip}>
            <Text style={styles.medChipText}>{med.name} — {med.dosage}</Text>
            <TouchableOpacity onPress={() => setMedications((prev) => prev.filter((_, i) => i !== idx))}>
              <Text style={styles.medChipRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {!showMedForm ? (
          <TouchableOpacity style={styles.addMedBtn} onPress={() => setShowMedForm(true)}>
            <Text style={styles.addMedIcon}>+</Text>
            <Text style={styles.addMedText}>{t('onboarding.add_medication')}</Text>
          </TouchableOpacity>
        ) : (
          <MedicationForm
            onSave={(med) => {
              setMedications((prev) => [...prev, med]);
              setShowMedForm(false);
            }}
            onCancel={() => setShowMedForm(false)}
            inline
          />
        )}
      </View>
    </ScrollView>
  );

  return (
    <LinearGradient colors={[COLORS.primaryLight, COLORS.blueLight, COLORS.white]} style={styles.gradient}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('app.name')}</Text>
          {renderProgressBar()}
          <Text style={styles.stepCount}>{t('onboarding.step_of', { current: step, total: TOTAL_STEPS })}</Text>
        </View>

        <View style={styles.card}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
          {step > 1 && (
            <Button
              title={t('onboarding.back')}
              onPress={() => setStep(step - 1)}
              variant="ghost"
              style={styles.backBtn}
            />
          )}
          <Button
            title={step === TOTAL_STEPS ? t('onboarding.finish') : t('onboarding.next')}
            onPress={step === TOTAL_STEPS ? handleFinish : handleNext}
            loading={loading}
            style={styles.nextBtn}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.primary, marginBottom: SPACING.md },
  progressContainer: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  progressDot: {
    width: 40, height: 6, borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  stepCount: { fontSize: FONTS.sm, color: COLORS.textSecondary },

  card: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: SPACING.xl, ...SHADOWS.md, overflow: 'hidden',
  },
  stepContent: { flex: 1 },
  stepEmoji: { fontSize: 48, textAlign: 'center', marginBottom: SPACING.md },
  stepTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 24,
  },

  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border,
    marginBottom: SPACING.md, backgroundColor: COLORS.background,
  },
  optionCardSelected: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight,
  },
  optionIcon: { fontSize: 28, marginRight: SPACING.md },
  optionTextGroup: { flex: 1 },
  optionLabel: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  optionLabelSelected: { color: COLORS.primary },
  optionSub: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },

  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },

  checkbox: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontWeight: FONTS.bold, fontSize: FONTS.sm },

  addMedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed',
    marginTop: SPACING.md,
  },
  addMedIcon: { fontSize: 24, color: COLORS.primary, marginRight: SPACING.sm },
  addMedText: { fontSize: FONTS.md, color: COLORS.primary, fontWeight: FONTS.semiBold },

  medChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  medChipText: { flex: 1, fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.medium },
  medChipRemove: { fontSize: FONTS.md, color: COLORS.primary, padding: SPACING.xs },

  footer: {
    flexDirection: 'row', gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});

export default OnboardingScreen;
