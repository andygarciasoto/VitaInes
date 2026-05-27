import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import LanguageToggle from '../../components/common/LanguageToggle';
import { signIn } from '../../services/firebase/auth';
import { googleSignIn } from '../../services/firebase/socialAuth';
import { useApp } from '../../store/AppContext';

const SignInScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = t('auth.error_invalid_email');
    if (!password || password.length < 6) errs.password = t('auth.error_weak_password');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      Alert.alert('Error', t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await googleSignIn();
    } catch (err) {
      if (err.message === 'NATIVE_NOT_CONFIGURED') {
        Alert.alert(
          'Google Sign-In',
          'Google Sign-In on mobile requires additional setup. Please use email/password or test on web.',
        );
      } else {
        Alert.alert('Error', t('auth.error_generic'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.primaryLight, COLORS.blueLight, COLORS.white]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACING.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.langRow}>
            <LanguageToggle />
          </View>

          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoHeart}>♥</Text>
            </View>
            <Text style={styles.appName}>{t('app.name')}</Text>
            <Text style={styles.tagline}>{t('app.tagline')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{t('auth.sign_in')}</Text>

            {/* Social Buttons */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <>
                  <Text style={styles.socialIcon}>G</Text>
                  <Text style={styles.socialText}>{t('auth.continue_with_google')}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('auth.password')}</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgot}>
              <Text style={styles.forgotText}>{t('auth.forgot_password')}</Text>
            </TouchableOpacity>

            <Button title={t('auth.sign_in')} onPress={handleSignIn} loading={loading} size="lg" style={styles.btn} />

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{t('auth.no_account')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.switchLink}>{t('auth.create_account')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.terms}>{t('auth.terms')}</Text>
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
  langRow: { alignItems: 'flex-end', marginBottom: SPACING.lg },

  logoContainer: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  logoHeart: { fontSize: 48, color: COLORS.white },
  appName: { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  tagline: { fontSize: FONTS.md, color: COLORS.textSecondary },

  form: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
  },
  formTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },

  // Social button
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
    borderRadius: RADIUS.full, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, marginBottom: SPACING.md,
    minHeight: 56, ...SHADOWS.sm,
  },
  socialIcon: {
    fontSize: FONTS.lg, fontWeight: FONTS.bold,
    color: '#4285F4', marginRight: SPACING.sm,
    width: 24, textAlign: 'center',
  },
  socialText: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: SPACING.md, fontSize: FONTS.sm, color: COLORS.textSecondary },

  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  input: {
    borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONTS.md, color: COLORS.textPrimary,
    backgroundColor: COLORS.background, minHeight: 56,
  },
  inputError: { borderColor: COLORS.high },
  errorText: { fontSize: FONTS.sm, color: COLORS.high, marginTop: SPACING.xs },

  forgot: { alignSelf: 'flex-end', marginBottom: SPACING.lg },
  forgotText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.medium },
  btn: { marginBottom: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.md },
  switchText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  switchLink: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  terms: { fontSize: FONTS.xs, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },
});

export default SignInScreen;
