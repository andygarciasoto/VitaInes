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
import LanguageToggle from '../../components/common/LanguageToggle';
import ViLogo from '../../components/common/ViLogo';
import { signUp } from '../../services/firebase/auth';

// ─── Config check ─────────────────────────────────────────────────────────────
const FIREBASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  !process.env.EXPO_PUBLIC_FIREBASE_API_KEY.startsWith('YOUR_');

// ─── Shared banners ───────────────────────────────────────────────────────────
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
        🔧  Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* environment variables to enable account creation.
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
  warningText: {
    color: '#856404',
    fontSize: FONTS.sm,
    lineHeight: 22,
  },
});

// ─── Password strength ────────────────────────────────────────────────────────
const checkPasswordRules = (pw) => ({
  length: pw.length >= 8,
  upper:  /[A-Z]/.test(pw),
  lower:  /[a-z]/.test(pw),
  number: /[0-9]/.test(pw),
});

const PasswordRequirements = ({ password, show }) => {
  if (!show) return null;
  const rules = checkPasswordRules(password);
  const items = [
    { key: 'length', label: t('auth.password_req_length'), met: rules.length },
    { key: 'upper',  label: t('auth.password_req_upper'),  met: rules.upper },
    { key: 'lower',  label: t('auth.password_req_lower'),  met: rules.lower },
    { key: 'number', label: t('auth.password_req_number'), met: rules.number },
  ];
  return (
    <View style={reqStyles.container}>
      {items.map(({ key, label, met }) => (
        <View key={key} style={reqStyles.row}>
          <Text style={[reqStyles.icon, met ? reqStyles.met : reqStyles.unmet]}>
            {met ? '✓' : '✗'}
          </Text>
          <Text style={[reqStyles.label, met ? reqStyles.metLabel : reqStyles.unmetLabel]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const reqStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  icon: { fontSize: FONTS.sm, width: 20, textAlign: 'center' },
  label: { fontSize: FONTS.sm },
  met:       { color: COLORS.normal },
  unmet:     { color: COLORS.high },
  metLabel:  { color: COLORS.textSecondary },
  unmetLabel: { color: COLORS.textSecondary },
});

// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({
  label, value, onChange, placeholder,
  secureTextEntry, keyboardType, error, children,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'none'}
      autoCorrect={false}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
    {children}
  </View>
);

// ─── Firebase error mapping ───────────────────────────────────────────────────
function mapSignUpError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'The email address is not valid. Please enter a correct email.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your network and try again.';
    case 'auth/operation-not-allowed':
      return 'Email sign-up is not enabled. Please contact support.';
    case 'auth/invalid-api-key':
      return 'Firebase is not configured correctly. Check your environment variables.';
    default:
      return `Account creation failed. (${code || 'unknown error'}) Please try again or contact support.`;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const SignUpScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerError, setBannerError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const clearFieldError = (field) =>
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));

  const allPasswordRulesMet = (pw) => {
    const r = checkPasswordRules(pw);
    return r.length && r.upper && r.lower && r.number;
  };

  const validate = () => {
    console.log('[SignUp] Validating inputs');
    const errs = {};
    if (!name.trim()) errs.name = 'Please enter your full name.';
    if (!email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Please enter a password.';
    } else if (!allPasswordRulesMet(password)) {
      errs.password = 'Password does not meet the requirements shown below.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match. Please check and try again.';
    }
    setFieldErrors(errs);
    const errorCount = Object.keys(errs).length;
    if (errorCount > 0) {
      console.log('[SignUp] Validation failed —', errorCount, 'error(s):', errs);
      setBannerError(
        errorCount === 1
          ? 'Please fix the error below before continuing.'
          : `Please fix ${errorCount} errors below before continuing.`
      );
      return false;
    }
    console.log('[SignUp] Validation passed');
    return true;
  };

  const handleSignUp = async () => {
    console.log('[SignUp] Create Account button pressed');
    setBannerError('');
    setPasswordTouched(true);

    if (!validate()) return;

    console.log('[SignUp] Sending account creation request to Firebase');
    setLoading(true);
    try {
      const user = await signUp(email.trim(), password, name.trim());
      console.log('[SignUp] Firebase createUser SUCCESS — uid:', user?.uid);
      console.log('[SignUp] Verification email sent to:', email.trim());
      // onAuthStateChanged fires here → AppNavigator routes to EmailVerificationScreen
    } catch (err) {
      const msg = mapSignUpError(err?.code);
      console.error('[SignUp] Firebase createUser FAILED — code:', err?.code, 'message:', err?.message);
      setBannerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.primaryLight, COLORS.blueLight, COLORS.white]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACING.md }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>←</Text>
            </TouchableOpacity>
            <LanguageToggle />
          </View>

          <View style={styles.logoContainer}>
            <ViLogo size={80} />
            <Text style={styles.appName}>{t('app.name')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{t('auth.sign_up')}</Text>

            <ConfigWarning />
            <ErrorBanner message={bannerError} />

            <Field
              label="Full Name"
              value={name}
              onChange={(v) => { setName(v); clearFieldError('name'); setBannerError(''); }}
              placeholder="María García"
              error={fieldErrors.name}
            />

            <Field
              label={t('auth.email')}
              value={email}
              onChange={(v) => { setEmail(v); clearFieldError('email'); setBannerError(''); }}
              placeholder="you@email.com"
              keyboardType="email-address"
              error={fieldErrors.email}
            />

            <Field
              label={t('auth.password')}
              value={password}
              onChange={(v) => {
                setPassword(v);
                setPasswordTouched(true);
                clearFieldError('password');
                setBannerError('');
              }}
              placeholder="••••••••"
              secureTextEntry
              error={fieldErrors.password}
            >
              <PasswordRequirements password={password} show={passwordTouched} />
            </Field>

            <Field
              label={t('auth.confirm_password')}
              value={confirmPassword}
              onChange={(v) => { setConfirmPassword(v); clearFieldError('confirmPassword'); setBannerError(''); }}
              placeholder="••••••••"
              secureTextEntry
              error={fieldErrors.confirmPassword}
            />

            <Button
              title={loading ? 'Creating account…' : t('auth.create_account')}
              onPress={handleSignUp}
              loading={loading}
              size="lg"
              style={styles.btn}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{t('auth.have_account')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.switchLink}>{t('auth.sign_in')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.lg,
  },
  back: { fontSize: FONTS.xl, color: COLORS.primary, padding: SPACING.sm },
  logoContainer: { alignItems: 'center', marginBottom: SPACING.xl },
  appName: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  form: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl,
    ...SHADOWS.md,
  },
  formTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.lg,
  },
  field: { marginBottom: SPACING.md },
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
  btn: { marginTop: SPACING.sm, marginBottom: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  switchLink: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
});

export default SignUpScreen;
