import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import LanguageToggle from '../../components/common/LanguageToggle';
import ViLogo from '../../components/common/ViLogo';
import { signUp } from '../../services/firebase/auth';

const checkPasswordRules = (pw) => ({
  length:  pw.length >= 8,
  upper:   /[A-Z]/.test(pw),
  lower:   /[a-z]/.test(pw),
  number:  /[0-9]/.test(pw),
});

const PasswordRequirements = ({ password, show }) => {
  if (!show) return null;
  const rules = checkPasswordRules(password);

  const Req = ({ met, label }) => (
    <View style={reqStyles.row}>
      <Text style={[reqStyles.icon, met ? reqStyles.met : reqStyles.unmet]}>
        {met ? '✓' : '✗'}
      </Text>
      <Text style={[reqStyles.label, met ? reqStyles.metLabel : reqStyles.unmetLabel]}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={reqStyles.container}>
      <Req met={rules.length} label={t('auth.password_req_length')} />
      <Req met={rules.upper}  label={t('auth.password_req_upper')} />
      <Req met={rules.lower}  label={t('auth.password_req_lower')} />
      <Req met={rules.number} label={t('auth.password_req_number')} />
    </View>
  );
};

const reqStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.xs, gap: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  icon: { fontSize: FONTS.sm, width: 18, textAlign: 'center' },
  label: { fontSize: FONTS.sm },
  met:       { color: COLORS.normal },
  unmet:     { color: COLORS.high },
  metLabel:  { color: COLORS.textSecondary },
  unmetLabel: { color: COLORS.textSecondary },
});

const Field = ({ label, value, onChange, placeholder, secureTextEntry, keyboardType, error, children }) => (
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
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      autoCorrect={false}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
    {children}
  </View>
);

const SignUpScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState(false);

  const allRulesMet = (pw) => {
    const r = checkPasswordRules(pw);
    return r.length && r.upper && r.lower && r.number;
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = t('auth.error_name_required');
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = t('auth.error_invalid_email');
    if (!allRulesMet(password)) errs.password = t('auth.error_weak_password_strong');
    if (password !== confirmPassword) errs.confirmPassword = t('auth.error_passwords_dont_match');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      navigation.replace('SignUpSuccess', { email: email.trim() });
    } catch (err) {
      const code = err?.code || '';
      let message = t('auth.error_generic');
      if (code === 'auth/email-already-in-use') message = t('auth.error_email_in_use');
      else if (code === 'auth/invalid-email') message = t('auth.error_invalid_email');
      else if (code === 'auth/weak-password') message = t('auth.error_weak_password_strong');
      else if (code === 'auth/network-request-failed') message = t('auth.error_network');
      else if (code === 'auth/operation-not-allowed') message = t('auth.error_operation_not_allowed');
      Alert.alert(t('auth.signup_error_title'), message);
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

            <Field
              label={t('profile.name')}
              value={name}
              onChange={setName}
              placeholder="María García"
              error={errors.name}
            />

            <Field
              label={t('auth.email')}
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              error={errors.email}
            />

            <Field
              label={t('auth.password')}
              value={password}
              onChange={(v) => { setPassword(v); setPasswordTouched(true); }}
              placeholder="••••••••"
              secureTextEntry
              error={errors.password}
            >
              <PasswordRequirements password={password} show={passwordTouched} />
            </Field>

            <Field
              label={t('auth.confirm_password')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              error={errors.confirmPassword}
            />

            <Button
              title={t('auth.create_account')}
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
  errorText: { fontSize: FONTS.sm, color: COLORS.high, marginTop: SPACING.xs },
  btn: { marginTop: SPACING.sm, marginBottom: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  switchLink: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
});

export default SignUpScreen;
