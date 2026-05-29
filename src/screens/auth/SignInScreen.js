import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import LanguageToggle from '../../components/common/LanguageToggle';
import ViLogo from '../../components/common/ViLogo';
import GoogleGIcon from '../../components/common/GoogleGIcon';
import { signIn } from '../../services/firebase/auth';
import { signInWithGoogleCredential } from '../../services/firebase/socialAuth';
import { useApp } from '../../store/AppContext';

// Required for expo-auth-session to close the browser after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

function getSignInErrorMessage(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('auth.error_invalid_credentials');
    case 'auth/too-many-requests':
      return t('auth.error_too_many_requests');
    case 'auth/network-request-failed':
      return t('auth.error_network');
    case 'auth/user-disabled':
      return t('auth.error_user_disabled');
    default:
      return t('auth.error_generic');
  }
}

// Isolated sub-component so the hook is only called on native.
// On web, this component is never mounted → no crash when clientId is absent.
const NativeGoogleButton = () => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const { id_token } = response.params;
      setGoogleLoading(true);
      signInWithGoogleCredential(id_token)
        .catch(() => Alert.alert(t('auth.error_title'), t('auth.error_google_failed')))
        .finally(() => setGoogleLoading(false));
    } else if (response.type === 'error') {
      setGoogleLoading(false);
      Alert.alert(t('auth.error_title'), t('auth.error_google_failed'));
    } else {
      setGoogleLoading(false);
    }
  }, [response]);

  const handlePress = () => {
    if (!request) {
      Alert.alert('Google Sign-In', t('auth.error_google_not_configured'));
      return;
    }
    setGoogleLoading(true);
    promptAsync().catch(() => setGoogleLoading(false));
  };

  return (
    <>
      <TouchableOpacity
        style={styles.socialBtn}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color={COLORS.textPrimary} />
        ) : (
          <>
            <GoogleGIcon size={20} style={styles.socialIconWrap} />
            <Text style={styles.socialText}>{t('auth.continue_with_google')}</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('auth.or')}</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );
};

const SignInScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    } catch (err) {
      Alert.alert(t('auth.error_title'), getSignInErrorMessage(err?.code));
    } finally {
      setLoading(false);
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
            <ViLogo size={100} />
            <Text style={styles.appName}>{t('app.name')}</Text>
            <Text style={styles.tagline}>{t('app.tagline')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>{t('auth.sign_in')}</Text>

            {/* Google Sign-In — native only (hook crashes on web without clientId) */}
            {Platform.OS !== 'web' && <NativeGoogleButton />}

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
  appName: { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  tagline: { fontSize: FONTS.md, color: COLORS.textSecondary },

  form: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
  },
  formTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#DADCE0',
    borderRadius: RADIUS.full, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, marginBottom: SPACING.md,
    minHeight: 56, ...SHADOWS.sm,
  },
  socialIconWrap: { marginRight: SPACING.sm },
  socialText: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },

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
