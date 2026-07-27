import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import Button from '../../components/common/Button';
import LanguageToggle from '../../components/common/LanguageToggle';
import { useApp } from '../../store/AppContext';
import { completeOnboarding } from '../../services/firebase/userProfile';
import { requestNotificationPermissions } from '../../services/notifications';

const FEATURES = [
  { icon: '📊', key: 'feature_track' },
  { icon: '📈', key: 'feature_history' },
  { icon: '✨', key: 'feature_insights' },
  { icon: '💊', key: 'feature_meds' },
];

const OnboardingScreen = () => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = async () => {
    if (!state.user) return;
    setLoading(true);
    try {
      await completeOnboarding(state.user.uid);
      // Update local state so AppNavigator immediately routes to Main
      dispatch({ type: 'SET_USER_PROFILE', payload: { ...state.userProfile, onboardingComplete: true } });
      requestNotificationPermissions().catch(() => {});
    } catch (err) {
      console.error('[Onboarding] completeOnboarding failed:', err?.code, err?.message);
      Alert.alert('Error', t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primaryLight, COLORS.blueLight, COLORS.white]}
      style={styles.gradient}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.xl }]}>
        {/* Language toggle */}
        <View style={styles.langRow}>
          <LanguageToggle />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroHeart}>♥</Text>
          <Text style={styles.appName}>{t('app.name')}</Text>
          <Text style={styles.tagline}>{t('onboarding.welcome_subtitle')}</Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureCard}>
          {FEATURES.map(f => (
            <View key={f.key} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <Text style={styles.featureText}>{t(`onboarding.${f.key}`)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>{t('app.disclaimer')}</Text>
          <Button
            title={t('onboarding.get_started')}
            onPress={handleGetStarted}
            loading={loading}
            size="lg"
            style={styles.startBtn}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACING.xl },

  langRow: { alignItems: 'flex-end', paddingTop: SPACING.md },

  hero: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: SPACING.xl },
  heroHeart: { fontSize: 72, color: COLORS.primary, marginBottom: SPACING.md },
  appName: {
    fontSize: FONTS.display,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: FONTS.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: SPACING.md,
  },

  featureCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.md,
    marginBottom: SPACING.xl,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1, fontSize: FONTS.md, color: COLORS.textPrimary, fontWeight: FONTS.medium },

  footer: { gap: SPACING.md },
  disclaimer: { fontSize: FONTS.xs, color: COLORS.textLight, textAlign: 'center', lineHeight: 18 },
  startBtn: {},
});

export default OnboardingScreen;
