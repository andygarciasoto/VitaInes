import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import ViLogo from '../../components/common/ViLogo';
import { resetPassword } from '../../services/firebase/auth';

// ─── Config check ─────────────────────────────────────────────────────────────
const FIREBASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  !process.env.EXPO_PUBLIC_FIREBASE_API_KEY.startsWith('YOUR_');

// ─── Banners ──────────────────────────────────────────────────────────────────
const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <View style={bannerStyles.error}>
      <Text style={bannerStyles.errorText}>⚠️  {message}</Text>
    </View>
  );
};

const ConfigWarning = () => {
  if (FIREBASE_CONFIGURED) return null;
  return (
    <View style={bannerStyles.warning}>
      <Text style={bannerStyles.warningText}>
        🔧  Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* environment variables to enable password reset.
      </Text>
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  error: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: COLORS.high,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.high,
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    lineHeight: 22,
  },
  warning: {
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#F39C12',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  warningText: { color: '#856404', fontSize: FONTS.sm, lineHeight: 22 },
});

// ─── Error mapping ────────────────────────────────────────────────────────────
function mapResetError(code) {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check the email and try again.';
    case 'auth/invalid-email':
      return 'The email address is not valid. Please enter a correct email.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your network and try again.';
    case 'auth/invalid-api-key':
      return 'Firebase is not configured correctly. Check your environment variables.';
    case 'auth/too-many-requests':
      return 'Too many reset attempts. Please wait a few minutes and try again.';
    default:
      return `Password reset failed. (${code || 'unknown error'}) Please try again or contact support.`;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const ForgotPasswordScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [bannerError, setBannerError] = useState('');

  const validate = () => {
    console.log('[ForgotPassword] Validating email:', email);
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      setBannerError('Please enter your email address before continuing.');
      console.log('[ForgotPassword] Validation failed — email is empty');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address.');
      setBannerError('The email address you entered is not valid.');
      console.log('[ForgotPassword] Validation failed — invalid email format');
      return false;
    }
    setEmailError('');
    setBannerError('');
    console.log('[ForgotPassword] Validation passed');
    return true;
  };

  const handleSend = async () => {
    console.log('[ForgotPassword] Send Reset Link button pressed');
    setBannerError('');

    if (!validate()) return;

    console.log('[ForgotPassword] Sending password reset email to:', email.trim());
    setLoading(true);
    try {
      await resetPassword(email.trim());
      console.log('[ForgotPassword] Password reset email sent SUCCESS');
      setSent(true);
    } catch (err) {
      const msg = mapResetError(err?.code);
      console.error('[ForgotPassword] Reset email FAILED — code:', err?.code, 'message:', err?.message);
      setBannerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.primaryLight, COLORS.blueLight, COLORS.white]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACING.md }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <ViLogo size={80} />
          </View>

          <View style={styles.form}>
            {sent ? (
              // ── Success state ──────────────────────────────────────────────
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successMessage}>
                  Password reset instructions have been sent to:
                </Text>
                <Text style={styles.successEmail}>{email}</Text>
                <Text style={styles.successNote}>
                  Check your inbox (and spam folder) for the reset link. It may take a minute to arrive.
                </Text>
                <Button
                  title="Back to Sign In"
                  onPress={() => navigation.navigate('SignIn')}
                  size="lg"
                  style={styles.btn}
                />
              </View>
            ) : (
              // ── Form state ─────────────────────────────────────────────────
              <>
                <Text style={styles.formTitle}>{t('auth.forgot_password_title')}</Text>
                <Text style={styles.subtitle}>{t('auth.forgot_password_subtitle')}</Text>

                <ConfigWarning />
                <ErrorBanner message={bannerError} />

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
                  <TextInput
                    style={[styles.input, emailError && styles.inputError]}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setEmailError('');
                      setBannerError('');
                    }}
                    placeholder="you@email.com"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>

                <Button
                  title={loading ? 'Sending…' : t('auth.send_reset_link')}
                  onPress={handleSend}
                  loading={loading}
                  size="lg"
                  style={styles.btn}
                />

                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={styles.linkRow}>
                  <Text style={styles.linkText}>{t('auth.back_to_sign_in')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },

  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.md },
  back: { fontSize: FONTS.xl, color: COLORS.primary, padding: SPACING.sm },
  logoContainer: { alignItems: 'center', marginBottom: SPACING.xl },

  form: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl,
    ...SHADOWS.md,
  },
  formTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    marginBottom: SPACING.lg, lineHeight: 26,
  },

  field: { marginBottom: SPACING.lg },
  fieldLabel: {
    fontSize: FONTS.md, fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONTS.md, color: COLORS.textPrimary,
    backgroundColor: COLORS.background, minHeight: 56,
  },
  inputError: { borderColor: COLORS.high },
  errorText: { fontSize: FONTS.sm, color: COLORS.high, marginTop: SPACING.xs, fontWeight: FONTS.medium },

  btn: { marginBottom: SPACING.md },
  linkRow: { alignItems: 'center', paddingVertical: SPACING.sm },
  linkText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },

  // Success state
  successBox: { alignItems: 'center', paddingVertical: SPACING.sm },
  successIcon: { fontSize: 56, marginBottom: SPACING.lg },
  successTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center',
  },
  successMessage: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.xs,
  },
  successEmail: {
    fontSize: FONTS.md, fontWeight: FONTS.bold,
    color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.md,
  },
  successNote: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl,
  },
});

export default ForgotPasswordScreen;
