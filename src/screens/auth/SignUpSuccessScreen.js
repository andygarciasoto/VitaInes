import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import ViLogo from '../../components/common/ViLogo';

const SignUpSuccessScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const email = route?.params?.email || '';

  // Auto-redirect to SignIn after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => navigation.navigate('SignIn'), 6000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={[COLORS.primaryLight, COLORS.blueLight, COLORS.white]}
      style={styles.gradient}
    >
      <View style={[styles.container, { paddingTop: insets.top + SPACING.xxl }]}>
        <ViLogo size={90} />

        <View style={styles.card}>
          <Text style={styles.checkmark}>✅</Text>
          <Text style={styles.title}>{t('auth.signup_success_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.signup_success_subtitle')}</Text>

          {email ? (
            <View style={styles.emailBox}>
              <Text style={styles.emailLabel}>{t('auth.signup_success_email_label')}</Text>
              <Text style={styles.emailValue}>{email}</Text>
              <Text style={styles.emailNote}>{t('auth.signup_success_note')}</Text>
            </View>
          ) : null}

          <Button
            title={t('auth.go_to_sign_in')}
            onPress={() => navigation.navigate('SignIn')}
            size="lg"
            style={styles.btn}
          />

          <Text style={styles.autoRedirect}>{t('auth.signup_auto_redirect')}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.md,
  },
  checkmark: { fontSize: 60, marginBottom: SPACING.md },
  title: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: SPACING.lg,
  },

  emailBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  emailLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  emailValue: {
    fontSize: FONTS.md, fontWeight: FONTS.semiBold,
    color: COLORS.primary, textAlign: 'center',
  },
  emailNote: {
    fontSize: FONTS.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  btn: { width: '100%', marginBottom: SPACING.md },
  autoRedirect: {
    fontSize: FONTS.xs, color: COLORS.textLight, textAlign: 'center',
  },
});

export default SignUpSuccessScreen;
