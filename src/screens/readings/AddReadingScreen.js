import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS, FONTS, SPACING, RADIUS,
  getBPStatus, getBPColor, getBPBgColor,
} from '../../constants/theme';
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

// ─── Validation config per field ──────────────────────────────────────────────
const FIELDS = {
  systolic:  { min: 70,  max: 250, required: true },
  diastolic: { min: 40,  max: 150, required: true },
  pulse:     { min: 30,  max: 220, required: false },
};

const STATUS_INFO = {
  normal:   { emoji: '✅', descKey: 'reading.normal_desc' },
  elevated: { emoji: '⚠️',  descKey: 'reading.elevated_desc' },
  high:     { emoji: '🔴', descKey: 'reading.high_desc' },
  crisis:   { emoji: '🚨', descKey: 'reading.crisis_desc' },
};

// Validate a single field, returning an error string or null
const validateField = (name, raw) => {
  const cfg = FIELDS[name];
  if (!raw || raw.trim() === '') {
    if (cfg.required) return t(`reading.enter_${name}`);
    return null;
  }
  const n = parseInt(raw, 10);
  if (isNaN(n)) return t(`reading.enter_${name}`);
  if (n < cfg.min || n > cfg.max) {
    return t(`reading.invalid_${name}`);
  }
  return null;
};

const AddReadingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { user, language, recentReadings } = state;

  const [systolic, setSystolic]   = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse]         = useState('');
  const [notes, setNotes]         = useState('');
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const diastolicRef   = useRef(null);
  const pulseRef       = useRef(null);
  // Ref-based lock prevents any duplicate saves, even on rapid double-tap
  const saveInProgress = useRef(false);

  // Navigate away after successful save — try pop(), fall back to navigate('Main')
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => {
      navigation.navigate('Main', { screen: 'History' });
    }, 900);
    return () => clearTimeout(timer);
  }, [saved, navigation]);

  // Live BP preview — only shown when both values are non-empty & plausible
  const sysNum = parseInt(systolic, 10);
  const diaNum = parseInt(diastolic, 10);
  const previewReady = (
    !isNaN(sysNum) && sysNum >= FIELDS.systolic.min && sysNum <= FIELDS.systolic.max &&
    !isNaN(diaNum) && diaNum >= FIELDS.diastolic.min && diaNum <= FIELDS.diastolic.max
  );
  const status     = previewReady ? getBPStatus(sysNum, diaNum) : null;
  const statusInfo = status ? STATUS_INFO[status] : null;

  // Clear field error as soon as the user starts editing
  const clearError = useCallback((name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  // Validate all required fields, set errors, return true if clean
  const validateAll = () => {
    const errs = {};
    ['systolic', 'diastolic', 'pulse'].forEach((name) => {
      const raw = name === 'systolic' ? systolic
                : name === 'diastolic' ? diastolic
                : pulse;
      const err = validateField(name, raw);
      if (err) errs[name] = err;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    // Ref check is synchronous — immune to React's async state batching
    if (saveInProgress.current) return;
    if (!validateAll()) return;
    if (!user?.uid) return;

    saveInProgress.current = true;
    setSaving(true);
    try {
      const pulseNum = pulse ? parseInt(pulse, 10) : null;
      const reading  = { systolic: sysNum, diastolic: diaNum, pulse: pulseNum, notes: notes.trim(), date: new Date() };

      const id         = await addReading(user.uid, reading);
      const newReading = { ...reading, id, timestamp: new Date() };

      dispatch({ type: 'ADD_READING', payload: newReading });

      const bpStatus = getBPStatus(sysNum, diaNum);
      if (bpStatus === 'high' || bpStatus === 'crisis') {
        await sendElevatedBPAlert(sysNum, diaNum, language);
      }

      const recs = await generateRecommendations([newReading, ...recentReadings], language);
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: recs });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      // navigation handled by useEffect above
    } catch (err) {
      saveInProgress.current = false; // allow the user to retry on error
      Alert.alert('Error', t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  // Full-screen success view shown after save
  if (saved) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title={t('reading.title')} showBack={false} showLanguage />
        <View style={styles.successScreen}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>{t('reading.saved')}</Text>
          <Text style={[styles.successReading, { color: getBPColor(sysNum, diaNum) }]}>
            {sysNum}/{diaNum} {t('common.mmhg')}
          </Text>
          {status && <BPStatusBadge systolic={sysNum} diastolic={diaNum} />}
          <Text style={styles.successSub}>{t('reading.returning')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={t('reading.title')}
        showBack
        onBack={() => navigation.goBack()}
        showLanguage
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Timestamp */}
          <Text style={styles.timestamp}>
            🕐 {format(new Date(), 'EEEE, MMMM d · h:mm a')}
          </Text>

          {/* Live status preview */}
          {previewReady && statusInfo && (
            <View style={[styles.statusBanner, { backgroundColor: getBPBgColor(sysNum, diaNum) }]}>
              <Text style={styles.statusEmoji}>{statusInfo.emoji}</Text>
              <View style={styles.statusBody}>
                <BPStatusBadge systolic={sysNum} diastolic={diaNum} />
                <Text style={[styles.statusDesc, { color: getBPColor(sysNum, diaNum) }]}>
                  {t(statusInfo.descKey)}
                </Text>
              </View>
            </View>
          )}

          {/* ── Blood Pressure ── */}
          <Text style={styles.sectionHeading}>Blood Pressure</Text>
          <View style={styles.bpRow}>
            {/* Systolic */}
            <View style={styles.bpCol}>
              <NumberInput
                label={t('reading.systolic')}
                hint={t('reading.systolic_hint')}
                value={systolic}
                onChange={(v) => { clearError('systolic'); setSystolic(v); }}
                min={FIELDS.systolic.min}
                max={FIELDS.systolic.max}
                unit={t('common.mmhg')}
                error={errors.systolic}
                placeholder="120"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => diastolicRef.current?.focus()}
              />
            </View>

            <Text style={styles.slash}>/</Text>

            {/* Diastolic */}
            <View style={styles.bpCol}>
              <NumberInput
                label={t('reading.diastolic')}
                hint={t('reading.diastolic_hint')}
                value={diastolic}
                onChange={(v) => { clearError('diastolic'); setDiastolic(v); }}
                min={FIELDS.diastolic.min}
                max={FIELDS.diastolic.max}
                unit={t('common.mmhg')}
                error={errors.diastolic}
                placeholder="80"
                inputRef={diastolicRef}
                returnKeyType="next"
                onSubmitEditing={() => pulseRef.current?.focus()}
              />
            </View>
          </View>

          {/* ── Pulse ── */}
          <Text style={styles.sectionHeading}>♥ {t('reading.pulse')}</Text>
          <NumberInput
            hint={t('reading.pulse_hint')}
            value={pulse}
            onChange={(v) => { clearError('pulse'); setPulse(v); }}
            min={FIELDS.pulse.min}
            max={FIELDS.pulse.max}
            unit={t('common.bpm')}
            error={errors.pulse}
            placeholder="70"
            inputRef={pulseRef}
            returnKeyType="done"
            onSubmitEditing={() => pulseRef.current?.blur()}
          />

          {/* ── Notes ── */}
          <Text style={styles.sectionHeading}>{t('reading.notes')}</Text>
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

          {/* ── Save button ── */}
          <Button
            title={saving ? t('reading.saving') : t('reading.save')}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            size="lg"
          />

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex:      { flex: 1 },
  scroll:    { padding: SPACING.lg },

  timestamp: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

  // Live status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  statusEmoji: { fontSize: 32, marginRight: SPACING.md },
  statusBody:  { flex: 1, gap: SPACING.xs },
  statusDesc:  { fontSize: FONTS.sm, lineHeight: 20, marginTop: 4 },

  // Section headings
  sectionHeading: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  // Systolic / diastolic side by side
  bpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bpCol:  { flex: 1 },
  slash: {
    fontSize: FONTS.xxl + 8,
    fontWeight: FONTS.bold,
    color: COLORS.textLight,
    marginHorizontal: SPACING.sm,
    marginTop: 44, // Align with the number input visually
  },

  // Notes
  notesInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    minHeight: 96,
    marginBottom: SPACING.xl,
  },

  // Full-screen success state
  successScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl, gap: SPACING.md,
  },
  successEmoji:   { fontSize: 80 },
  successTitle:   { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.normal },
  successReading: { fontSize: FONTS.xxl, fontWeight: FONTS.bold },
  successSub:     { fontSize: FONTS.sm, color: COLORS.textLight, marginTop: SPACING.sm },
});

export default AddReadingScreen;
