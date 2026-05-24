import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, getBPStatus, getBPColor, getBPBgColor } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import NumberInput from '../../components/common/NumberInput';
import Button from '../../components/common/Button';
import BPStatusBadge from '../../components/common/BPStatusBadge';
import Header from '../../components/common/Header';
import { addReading } from '../../services/firebase/readings';
import { sendElevatedBPAlert } from '../../services/notifications';
import { generateRecommendations } from '../../services/ai/recommendations';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

const STATUS_INFO = {
  normal: { emoji: '✅', descKey: 'reading.normal_desc' },
  elevated: { emoji: '⚠️', descKey: 'reading.elevated_desc' },
  high: { emoji: '🔴', descKey: 'reading.high_desc' },
  crisis: { emoji: '🚨', descKey: 'reading.crisis_desc' },
};

const AddReadingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { user, language, recentReadings } = state;

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const sys = parseInt(systolic, 10);
  const dia = parseInt(diastolic, 10);
  const hasValidBP = !isNaN(sys) && !isNaN(dia) && sys > 0 && dia > 0;
  const status = hasValidBP ? getBPStatus(sys, dia) : null;
  const statusInfo = status ? STATUS_INFO[status] : null;

  const validate = () => {
    const errs = {};
    const sysNum = parseInt(systolic, 10);
    const diaNum = parseInt(diastolic, 10);
    const pulseNum = parseInt(pulse, 10);

    if (!systolic) {
      errs.systolic = t('reading.enter_systolic');
    } else if (sysNum < 60 || sysNum > 250) {
      errs.systolic = t('reading.invalid_systolic');
    }

    if (!diastolic) {
      errs.diastolic = t('reading.enter_diastolic');
    } else if (diaNum < 40 || diaNum > 150) {
      errs.diastolic = t('reading.invalid_diastolic');
    }

    if (pulse && (pulseNum < 30 || pulseNum > 200)) {
      errs.pulse = t('reading.invalid_pulse');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!user?.uid) return;

    setSaving(true);
    try {
      const sysNum = parseInt(systolic, 10);
      const diaNum = parseInt(diastolic, 10);
      const pulseNum = pulse ? parseInt(pulse, 10) : null;

      const reading = {
        systolic: sysNum,
        diastolic: diaNum,
        pulse: pulseNum,
        notes: notes.trim(),
        date: new Date(),
      };

      const id = await addReading(user.uid, reading);
      const newReading = { ...reading, id, timestamp: new Date() };

      dispatch({ type: 'ADD_READING', payload: newReading });

      // Send alert for high/crisis readings
      const bpStatus = getBPStatus(sysNum, diaNum);
      if (bpStatus === 'high' || bpStatus === 'crisis') {
        await sendElevatedBPAlert(sysNum, diaNum, language);
      }

      // Update recommendations
      const updatedReadings = [newReading, ...recentReadings];
      const recs = await generateRecommendations(updatedReadings, language);
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: recs });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);

      setTimeout(() => navigation.goBack(), 1500);
    } catch {
      Alert.alert('Error', t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={t('reading.title')}
        showBack
        onBack={() => navigation.goBack()}
        showLanguage={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date/time row */}
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>🕐 {format(new Date(), 'EEEE, MMMM d · h:mm a')}</Text>
          </View>

          {/* Status preview */}
          {hasValidBP && statusInfo && (
            <View style={[styles.statusPreview, { backgroundColor: getBPBgColor(sys, dia) }]}>
              <Text style={styles.statusEmoji}>{statusInfo.emoji}</Text>
              <View style={styles.statusText}>
                <BPStatusBadge systolic={sys} diastolic={dia} />
                <Text style={[styles.statusDesc, { color: getBPColor(sys, dia) }]}>
                  {t(statusInfo.descKey)}
                </Text>
              </View>
            </View>
          )}

          {/* BP Inputs */}
          <View style={styles.bpInputsRow}>
            <View style={styles.bpInputCol}>
              <NumberInput
                label={t('reading.systolic')}
                hint={t('reading.systolic_hint')}
                value={systolic}
                onChange={setSystolic}
                min={60}
                max={250}
                unit={t('common.mmhg')}
                error={errors.systolic}
              />
            </View>
            <View style={styles.divider}>
              <Text style={styles.dividerText}>/</Text>
            </View>
            <View style={styles.bpInputCol}>
              <NumberInput
                label={t('reading.diastolic')}
                hint={t('reading.diastolic_hint')}
                value={diastolic}
                onChange={setDiastolic}
                min={40}
                max={150}
                unit={t('common.mmhg')}
                error={errors.diastolic}
              />
            </View>
          </View>

          {/* Pulse */}
          <View style={styles.pulseRow}>
            <NumberInput
              label={`♥ ${t('reading.pulse')}`}
              hint={t('reading.pulse_hint')}
              value={pulse}
              onChange={setPulse}
              min={30}
              max={200}
              unit={t('common.bpm')}
              error={errors.pulse}
            />
          </View>

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>{t('reading.notes')}</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('reading.notes_placeholder')}
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Save button */}
          {saved ? (
            <View style={styles.savedContainer}>
              <Text style={styles.savedText}>✅ {t('reading.saved')}</Text>
            </View>
          ) : (
            <Button
              title={t('reading.save')}
              onPress={handleSave}
              loading={saving}
              size="lg"
              style={styles.saveBtn}
            />
          )}

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { padding: SPACING.lg },

  dateRow: { marginBottom: SPACING.md },
  dateLabel: { fontSize: FONTS.md, color: COLORS.textSecondary, textAlign: 'center' },

  statusPreview: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  statusEmoji: { fontSize: 32, marginRight: SPACING.md },
  statusText: { flex: 1, gap: SPACING.xs },
  statusDesc: { fontSize: FONTS.sm, lineHeight: 20, marginTop: SPACING.xs },

  bpInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bpInputCol: { flex: 1 },
  divider: { width: 40, alignItems: 'center', paddingBottom: SPACING.md },
  dividerText: { fontSize: FONTS.xxl, color: COLORS.textLight, fontWeight: FONTS.bold },

  pulseRow: { marginBottom: SPACING.sm },

  notesSection: { marginBottom: SPACING.xl },
  notesLabel: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  notesInput: {
    borderWidth: 2, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    fontSize: FONTS.md, color: COLORS.textPrimary,
    backgroundColor: COLORS.white, minHeight: 96,
  },

  saveBtn: {},
  savedContainer: {
    backgroundColor: COLORS.normalBg, borderRadius: RADIUS.lg,
    padding: SPACING.lg, alignItems: 'center',
  },
  savedText: { fontSize: FONTS.lg, fontWeight: FONTS.semiBold, color: COLORS.normal },
});

export default AddReadingScreen;
