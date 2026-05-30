import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Button from '../../components/common/Button';
import ViLogo from '../../components/common/ViLogo';
import { reloadUser, resendVerificationEmail, signOut } from '../../services/firebase/auth';

// ─── Banners ──────────────────────────────────────────────────────────────────
const Banner = ({ message, success }) => {
  if (!message) return null;
  return (
    <View style={[styles.banner, success ? styles.bannerSuccess : styles.bannerError]}>
      <Text style={[styles.bannerText, success ? styles.bannerTextSuccess : styles.bannerTextError]}>
        {success ? '✅  ' : '⚠️  '}{message}
      </Text>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const EmailVerificationScreen = () => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { user } = state;

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleCheckVerification = async () => {
    setChecking(true);
    setCheckError('');
    setResendMessage('');
    try {
      const updatedUser = await reloadUser();
      if (updatedUser.emailVerified) {
        dispatch({ type: 'REFRESH_USER', payload: updatedUser });
        // AppNavigator automatically routes to Onboarding/Main
      } else {
        setCheckError(t('auth.email_verification_not_yet'));
      }
    } catch {
      setCheckError('Could not check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    setResendSuccess(false);
    setCheckError('');
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
      setResendMessage(t('auth.email_verification_resent'));
    } catch (err) {
      setResendSuccess(false);
      if (err?.code === 'auth/too-many-requests') {
        setResendMessage('Too many attempts. Please wait a few minutes before resending.');
      } else {
        setResendMessage('Could not send the email. Check your connection and try again.');
      }
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {}
    dispatch({ type: 'SIGN_OUT' });
  };

  return (
    <LinearGradient colors={[COLORS.primaryLight, COLORS.blueLight, COLORS.white]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACING.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <ViLogo size={72} />
        </View>

        <View style={styles.card}>

          {/* Header */}
          <Text style={styles.icon}>✉️</Text>
          <Text style={styles.title}>{t('auth.email_verification_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.email_verification_subtitle')}</Text>
          <View style={styles.emailBox}>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          {/* Spam tip */}
          <View style={styles.spamTip}>
            <Text style={styles.spamTipTitle}>📁  Can't find the email?</Text>
            <Text style={styles.spamTipText}>
              Check your <Text style={styles.spamTipBold}>Spam</Text>,{' '}
              <Text style={styles.spamTipBold}>Junk</Text>, or{' '}
              <Text style={styles.spamTipBold}>Promotions</Text> folder.
              Firebase verification emails sometimes land there.
            </Text>
          </View>

          {/* Feedback banners */}
          <Banner message={checkError} success={false} />
          <Banner message={resendMessage} success={resendSuccess} />

          {/* Primary action */}
          <Button
            title={checking ? 'Checking…' : t('auth.email_verification_check')}
            onPress={handleCheckVerification}
            loading={checking}
            size="lg"
            style={styles.primaryBtn}
          />

          {/* Resend */}
          <Button
            title={resending ? 'Sending…' : t('auth.email_verification_resend')}
            onPress={handleResend}
            loading={resending}
            variant="outline"
            style={styles.secondaryBtn}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sign out — returns to SignIn where Google/Apple login are available */}
          <Text style={styles.signOutLabel}>
            Want to use a different account or sign-in method?
          </Text>
          <Button
            title={signingOut ? 'Signing out…' : '← Back to Sign In'}
            onPress={handleSignOut}
            loading={signingOut}
            variant="outline"
            style={styles.signOutBtn}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },

  logoContainer: { alignItems: 'center', marginBottom: SPACING.lg },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },

  icon: { fontSize: 52, marginBottom: SPACING.sm },
  title: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.sm,
  },
  emailBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
    width: '100%',
    alignItems: 'center',
  },
  email: {
    fontSize: FONTS.md, fontWeight: FONTS.bold,
    color: COLORS.primary, textAlign: 'center',
  },

  spamTip: {
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#F39C12',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  spamTipTitle: {
    fontSize: FONTS.sm, fontWeight: FONTS.bold,
    color: '#856404', marginBottom: 4,
  },
  spamTipText: {
    fontSize: FONTS.sm, color: '#856404', lineHeight: 20,
  },
  spamTipBold: { fontWeight: FONTS.bold },

  banner: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bannerError: { backgroundColor: '#FDECEA', borderColor: COLORS.high },
  bannerSuccess: { backgroundColor: '#EAF7EE', borderColor: COLORS.normal },
  bannerText: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, lineHeight: 22, textAlign: 'center' },
  bannerTextError: { color: COLORS.high },
  bannerTextSuccess: { color: COLORS.normal },

  primaryBtn: { width: '100%', marginBottom: SPACING.sm },
  secondaryBtn: { width: '100%' },

  divider: {
    width: '100%', height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.lg,
  },

  signOutLabel: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  signOutBtn: { width: '100%' },
});

export default EmailVerificationScreen;
