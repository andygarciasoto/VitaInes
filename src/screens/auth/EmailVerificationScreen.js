import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Button from '../../components/common/Button';
import ViLogo from '../../components/common/ViLogo';
import { reloadUser, resendVerificationEmail, signOut } from '../../services/firebase/auth';

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

const EmailVerificationScreen = () => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { user } = state;

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
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
        // AppNavigator will re-render and route to Onboarding/Main automatically
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
      setResendMessage(
        err?.code === 'auth/too-many-requests'
          ? 'Too many requests. Please wait a few minutes before resending.'
          : 'Could not resend the verification email. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
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
          <ViLogo size={80} />
        </View>

        <View style={styles.card}>
          <Text style={styles.icon}>✉️</Text>
          <Text style={styles.title}>{t('auth.email_verification_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.email_verification_subtitle')}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.note}>{t('auth.email_verification_note')}</Text>

          <Banner message={checkError} success={false} />
          <Banner message={resendMessage} success={resendSuccess} />

          <Button
            title={checking ? 'Checking…' : t('auth.email_verification_check')}
            onPress={handleCheckVerification}
            loading={checking}
            size="lg"
            style={styles.primaryBtn}
          />

          <Button
            title={resending ? 'Sending…' : t('auth.email_verification_resend')}
            onPress={handleResend}
            loading={resending}
            variant="outline"
            style={styles.secondaryBtn}
          />

          <TouchableOpacity onPress={handleSignOut} style={styles.signOutRow}>
            <Text style={styles.signOutText}>Sign out and use a different account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },

  logoContainer: { alignItems: 'center', marginBottom: SPACING.xl },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },

  icon: { fontSize: 56, marginBottom: SPACING.md },
  title: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.xs,
  },
  email: {
    fontSize: FONTS.md, fontWeight: FONTS.bold,
    color: COLORS.primary, textAlign: 'center',
    marginBottom: SPACING.md,
  },
  note: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
    marginBottom: SPACING.xl,
  },

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
  secondaryBtn: { width: '100%', marginBottom: SPACING.lg },

  signOutRow: { paddingVertical: SPACING.sm },
  signOutText: {
    fontSize: FONTS.sm, color: COLORS.textLight,
    textDecorationLine: 'underline',
  },
});

export default EmailVerificationScreen;
