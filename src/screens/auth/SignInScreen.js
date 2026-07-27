import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import LanguageToggle from '../../components/common/LanguageToggle';
import ViLogo from '../../components/common/ViLogo';
import GoogleGIcon from '../../components/common/GoogleGIcon';
import { signIn } from '../../services/firebase/auth';
import {
  signInWithGoogleCredential,
  signInWithAppleCredential,
  generateNonce,
} from '../../services/firebase/socialAuth';

WebBrowser.maybeCompleteAuthSession();

// ─── Config check ────────────────────────────────────────────────────────────
const FIREBASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  !process.env.EXPO_PUBLIC_FIREBASE_API_KEY.startsWith('YOUR_');

// ─── Shared UI pieces ────────────────────────────────────────────────────────
const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <View style={sharedStyles.errorBanner}>
      <Text style={sharedStyles.errorBannerText}>⚠️  {message}</Text>
    </View>
  );
};

const ConfigWarning = () => {
  if (FIREBASE_CONFIGURED) return null;
  return (
    <View style={sharedStyles.configWarning}>
      <Text style={sharedStyles.configWarningText}>
        🔧  Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* environment variables to enable authentication.
      </Text>
    </View>
  );
};

const sharedStyles = StyleSheet.create({
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
  configWarning: {
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#F39C12',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  configWarningText: {
    color: '#856404',
    fontSize: FONTS.sm,
    lineHeight: 22,
  },
});

// ─── Error code → message ────────────────────────────────────────────────────
function mapFirebaseError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/invalid-email':
      return 'The email address is not valid. Please enter a correct email.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Please sign in with email and password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your network and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/invalid-api-key':
      return 'Firebase is not configured correctly. Check your environment variables.';
    default:
      return `Sign-in failed. (${code || 'unknown error'}) Please try again or contact support.`;
  }
}

// ─── Apple Sign-In ────────────────────────────────────────────────────────────
const NativeAppleButton = ({ onError }) => {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  const handlePress = async () => {
    console.log('[SignIn] Apple Sign-In button pressed');
    setLoading(true);
    onError('');
    try {
      const { rawNonce, hashedNonce } = await generateNonce();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      console.log('[SignIn] Apple credential received, signing into Firebase');
      await signInWithAppleCredential(
        credential.identityToken,
        rawNonce,
        credential.fullName
      );
      console.log('[SignIn] Apple Sign-In SUCCESS');
    } catch (err) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[SignIn] Apple Sign-In error:', err.code, err.message);
        onError(mapFirebaseError(err?.code));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.socialBtn, styles.appleBtnLoading]}>
        <ActivityIndicator color={COLORS.white} />
      </View>
    );
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={RADIUS.full}
      style={styles.appleBtn}
      onPress={handlePress}
    />
  );
};

// ─── Google Sign-In ───────────────────────────────────────────────────────────
// Split into parent + child so the hook is never called without a valid clientId.
// On iOS, useIdTokenAuthRequest throws an invariant if iosClientId is undefined.
const GoogleButtonInner = ({ iosClientId, onError }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const { id_token } = response.params;
      console.log('[SignIn] Google token received, signing into Firebase');
      setGoogleLoading(true);
      signInWithGoogleCredential(id_token)
        .then(() => console.log('[SignIn] Google Sign-In SUCCESS'))
        .catch((err) => {
          console.error('[SignIn] Google Firebase error:', err.code, err.message);
          onError(mapFirebaseError(err?.code));
        })
        .finally(() => setGoogleLoading(false));
    } else if (response.type === 'error') {
      console.error('[SignIn] Google auth session error:', response.error);
      setGoogleLoading(false);
      onError('Google sign-in failed. Please try again.');
    } else {
      setGoogleLoading(false);
    }
  }, [response]);

  const handlePress = () => {
    console.log('[SignIn] Google Sign-In button pressed, request ready:', !!request);
    if (!request) {
      onError('Google Sign-In is not configured. Please use email/password sign-in.');
      return;
    }
    onError('');
    setGoogleLoading(true);
    promptAsync().catch((err) => {
      console.error('[SignIn] promptAsync error:', err);
      setGoogleLoading(false);
      onError('Could not open Google sign-in. Please try again.');
    });
  };

  return (
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
  );
};

const NativeGoogleButton = ({ onError }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'ios' && !iosClientId) return null;
  return <GoogleButtonInner iosClientId={iosClientId} onError={onError} />;
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const SignInScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerError, setBannerError] = useState('');

  const validate = () => {
    console.log('[SignIn] Validating inputs — email:', email, 'password length:', password.length);
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Please enter your password.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errs);
    const valid = Object.keys(errs).length === 0;
    if (!valid) {
      console.log('[SignIn] Validation failed:', errs);
      setBannerError('Please fix the errors below before signing in.');
    }
    return valid;
  };

  const handleSignIn = async () => {
    console.log('[SignIn] Sign In button pressed');
    setBannerError('');
    if (!validate()) return;

    console.log('[SignIn] Validation passed — calling Firebase signIn');
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      console.log('[SignIn] Firebase signIn SUCCESS — uid:', user?.uid);
      // Navigation is handled automatically by onAuthStateChanged in AppContext
    } catch (err) {
      const msg = mapFirebaseError(err?.code);
      console.error('[SignIn] Firebase signIn FAILED — code:', err?.code, 'message:', err?.message);
      setBannerError(msg);
      setFieldErrors({});
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

            <ConfigWarning />
            <ErrorBanner message={bannerError} />

            {/* Apple first (iOS native only — self-hides when unavailable) */}
            {Platform.OS === 'ios' && <NativeAppleButton onError={setBannerError} />}
            {/* Google available on web, iOS, and Android via expo-auth-session */}
            <NativeGoogleButton onError={setBannerError} />
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
              <TextInput
                style={[styles.input, fieldErrors.email && styles.inputError]}
                value={email}
                onChangeText={(v) => { setEmail(v); setFieldErrors((e) => ({ ...e, email: '' })); setBannerError(''); }}
                placeholder="you@email.com"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('auth.password')}</Text>
              <TextInput
                style={[styles.input, fieldErrors.password && styles.inputError]}
                value={password}
                onChangeText={(v) => { setPassword(v); setFieldErrors((e) => ({ ...e, password: '' })); setBannerError(''); }}
                placeholder="••••••"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry
                autoCapitalize="none"
              />
              {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgot}>
              <Text style={styles.forgotText}>{t('auth.forgot_password')}</Text>
            </TouchableOpacity>

            <Button
              title={loading ? 'Signing in…' : t('auth.sign_in')}
              onPress={handleSignIn}
              loading={loading}
              size="lg"
              style={styles.btn}
            />

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
    ...SHADOWS.md,
  },
  formTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },

  appleBtn: { width: '100%', height: 56, marginBottom: SPACING.md },
  appleBtnLoading: {
    backgroundColor: '#1C1C1E', borderColor: '#1C1C1E',
    borderRadius: RADIUS.full, height: 56, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
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
  errorText: { fontSize: FONTS.sm, color: COLORS.high, marginTop: SPACING.xs, fontWeight: FONTS.medium },

  forgot: { alignSelf: 'flex-end', marginBottom: SPACING.lg },
  forgotText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.medium },
  btn: { marginBottom: SPACING.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.md },
  switchText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  switchLink: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  terms: { fontSize: FONTS.xs, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },
});

export default SignInScreen;
