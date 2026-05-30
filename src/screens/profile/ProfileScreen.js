import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import { updateUserProfile } from '../../services/firebase/userProfile';
import { signOut } from '../../services/firebase/auth';
import { cancelAllNotifications, requestNotificationPermissions } from '../../services/notifications';

// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, keyboardType }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      keyboardType={keyboardType}
      autoCorrect={false}
    />
  </View>
);

// ─── Inline error banner ──────────────────────────────────────────────────────
const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>⚠️  {message}</Text>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, dispatch, setLanguage } = useApp();
  const { user, userProfile, language } = state;

  const [name, setName] = useState(userProfile?.displayName || user?.displayName || '');
  const [doctorName, setDoctorName] = useState(userProfile?.doctorName || '');
  const [doctorPhone, setDoctorPhone] = useState(userProfile?.doctorPhone || '');
  const [emergencyContact, setEmergencyContact] = useState(userProfile?.emergencyContact || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Sign-out state
  const [signOutConfirming, setSignOutConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setSaveError('');
    try {
      await updateUserProfile(user.uid, {
        displayName: name.trim(),
        doctorName: doctorName.trim(),
        doctorPhone: doctorPhone.trim(),
        emergencyContact: emergencyContact.trim(),
      });
      dispatch({
        type: 'SET_USER_PROFILE',
        payload: {
          ...userProfile,
          displayName: name.trim(),
          doctorName: doctorName.trim(),
          doctorPhone: doctorPhone.trim(),
          emergencyContact: emergencyContact.trim(),
        },
      });
      Alert.alert('✅', 'Profile saved successfully!');
    } catch (err) {
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const handleNotificationsToggle = async (value) => {
    setNotificationsEnabled(value);
    if (value) {
      await requestNotificationPermissions();
    } else {
      await cancelAllNotifications();
    }
  };

  // ── Language ──────────────────────────────────────────────────────────────
  const handleLanguageToggle = async () => {
    const newLang = language === 'en' ? 'es' : 'en';
    await setLanguage(newLang);
    if (user?.uid) {
      await updateUserProfile(user.uid, { language: newLang });
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOutPress = () => {
    console.log('[ProfileScreen] Sign Out button pressed — showing inline confirmation');
    setSignOutError('');
    setSignOutConfirming(true);
  };

  const handleSignOutCancel = () => {
    console.log('[ProfileScreen] Sign Out cancelled by user');
    setSignOutConfirming(false);
    setSignOutError('');
  };

  const handleSignOutConfirm = async () => {
    console.log('[ProfileScreen] Sign Out confirmed — starting logout process');
    setSigningOut(true);
    setSignOutError('');

    try {
      // 1. Cancel all local notifications so they don't fire for a logged-out user
      console.log('[ProfileScreen] Cancelling notifications');
      await cancelAllNotifications().catch(() => {});

      // 2. Sign out from Firebase — clears auth token on the device
      console.log('[ProfileScreen] Calling Firebase signOut');
      await signOut();
      console.log('[ProfileScreen] Firebase signOut SUCCESS');

      // 3. Clear AsyncStorage — removes language pref and any cached data
      console.log('[ProfileScreen] Clearing AsyncStorage');
      await AsyncStorage.clear().catch((e) =>
        console.warn('[ProfileScreen] AsyncStorage.clear failed (non-fatal):', e)
      );

      // 4. Reset app state — onAuthStateChanged will also fire with null,
      //    but we dispatch immediately so navigation switches without delay.
      console.log('[ProfileScreen] Dispatching SIGN_OUT');
      dispatch({ type: 'SIGN_OUT' });

      // AppNavigator automatically shows Auth screens when user becomes null.
      console.log('[ProfileScreen] Logout complete — navigation handled by AppNavigator');
    } catch (err) {
      console.error('[ProfileScreen] Sign Out FAILED:', err?.code, err?.message);
      setSignOutError(
        `Sign out failed: ${err?.message || 'Unknown error'}. Please try again.`
      );
      setSigningOut(false);
      setSignOutConfirming(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={t('profile.title')} showLanguage={false} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{name || user?.email}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Personal info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Personal Information</Text>
          <Field label={t('profile.name')} value={name} onChange={setName} placeholder="Your name" />
          <Field label={t('profile.doctor_name')} value={doctorName} onChange={setDoctorName} placeholder="Dr. Smith" />
          <Field
            label={t('profile.doctor_phone')}
            value={doctorPhone}
            onChange={setDoctorPhone}
            placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad"
          />
          <Field
            label={t('profile.emergency_contact')}
            value={emergencyContact}
            onChange={setEmergencyContact}
            placeholder="Family member name & phone"
          />
          {saveError ? <ErrorBanner message={saveError} /> : null}
          <Button title={saving ? 'Saving…' : t('profile.save')} onPress={handleSave} loading={saving} />
        </Card>

        {/* Settings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>{t('profile.notifications')}</Text>
              <Text style={styles.settingDesc}>Blood pressure & medication reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <TouchableOpacity style={styles.settingRow} onPress={handleLanguageToggle}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>{t('profile.language')}</Text>
              <Text style={styles.settingDesc}>{language === 'en' ? 'English' : 'Español'}</Text>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('History')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>📊 {t('nav.history')}</Text>
              <Text style={styles.settingDesc}>View all your readings</Text>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* Data info */}
        <Card style={styles.section} variant="flat">
          <Text style={styles.dataTitle}>🔒 Your Data</Text>
          <Text style={styles.dataText}>{t('profile.data_retention')}</Text>
          <Text style={styles.dataText}>{t('app.disclaimer')}</Text>
        </Card>

        {/* Sign out error */}
        <ErrorBanner message={signOutError} />

        {/* Sign out — inline confirmation replaces Alert.alert */}
        {signOutConfirming ? (
          <Card style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Sign Out?</Text>
            <Text style={styles.confirmMessage}>
              You will be returned to the sign-in screen. Any unsaved changes will be lost.
            </Text>
            <Button
              title={signingOut ? 'Signing out…' : 'Yes, Sign Out'}
              onPress={handleSignOutConfirm}
              loading={signingOut}
              variant="danger"
              style={styles.confirmBtn}
            />
            <Button
              title="Cancel"
              onPress={handleSignOutCancel}
              variant="outline"
              disabled={signingOut}
            />
          </Card>
        ) : (
          <Button
            title={`🚪 ${t('profile.sign_out')}`}
            onPress={handleSignOutPress}
            variant="outline"
            style={styles.signOutBtn}
          />
        )}

        <Text style={styles.version}>{t('profile.version')} 1.0.0</Text>
        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },

  avatarSection: { alignItems: 'center', marginBottom: SPACING.xl },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  avatarText: { fontSize: FONTS.display, fontWeight: FONTS.bold, color: COLORS.white },
  userName: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  userEmail: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 4 },

  section: { marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONTS.md, fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary, marginBottom: SPACING.md,
  },

  field: { marginBottom: SPACING.md },
  fieldLabel: {
    fontSize: FONTS.md, fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONTS.md, color: COLORS.textPrimary,
    backgroundColor: COLORS.background, minHeight: 52,
  },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  settingLeft: { flex: 1 },
  settingLabel: { fontSize: FONTS.md, fontWeight: FONTS.medium, color: COLORS.textPrimary },
  settingDesc: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  settingArrow: { fontSize: FONTS.lg, color: COLORS.textLight },

  dataTitle: {
    fontSize: FONTS.md, fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary, marginBottom: SPACING.sm,
  },
  dataText: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.xs },

  signOutBtn: { marginBottom: SPACING.md },

  // Inline sign-out confirmation card
  confirmCard: {
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.high,
  },
  confirmTitle: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold,
    color: COLORS.high, marginBottom: SPACING.sm,
  },
  confirmMessage: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    lineHeight: 24, marginBottom: SPACING.lg,
  },
  confirmBtn: { marginBottom: SPACING.sm },

  // Error banner
  errorBanner: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: COLORS.high,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    color: COLORS.high,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    lineHeight: 22,
  },

  version: { textAlign: 'center', fontSize: FONTS.sm, color: COLORS.textLight },
});

export default ProfileScreen;
