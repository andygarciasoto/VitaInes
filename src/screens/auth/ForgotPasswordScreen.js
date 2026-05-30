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
import ViLogo from '../../components/common/ViLogo';
import { resetPassword } from '../../services/firebase/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validate = () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(t('auth.error_invalid_email'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      const code = err?.code || '';
      let message = t('auth.error_generic');
      if (code === 'auth/user-not-found') message = t('auth.error_reset_no_user');
      else if (code === 'auth/invalid-email') message = t('auth.error_invalid_email');
      else if (code === 'auth/network-request-failed') message = t('auth.error_network');
      Alert.alert(t('auth.reset_error_title'), message);
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
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.successTitle}>{t('auth.reset_sent_title')}</Text>
                <Text style={styles.successMessage}>{t('auth.reset_sent_message')}</Text>
                <Button
                  title={t('auth.back_to_sign_in')}
                  onPress={() => navigation.navigate('SignIn')}
                  style={styles.btn}
                />
              </View>
            ) : (
              <>
                <Text style={styles.formTitle}>{t('auth.forgot_password_title')}</Text>
                <Text style={styles.subtitle}>{t('auth.forgot_password_subtitle')}</Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
                  <TextInput
                    style={[styles.input, emailError && styles.inputError]}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                    placeholder="you@email.com"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>

                <Button
                  title={t('auth.send_reset_link')}
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
    marginBottom: SPACING.xl, lineHeight: 26,
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
  errorText: { fontSize: FONTS.sm, color: COLORS.high, marginTop: SPACING.xs },

  btn: { marginBottom: SPACING.md },

  linkRow: { alignItems: 'center', paddingVertical: SPACING.sm },
  linkText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },

  successBox: { alignItems: 'center', paddingVertical: SPACING.lg },
  successIcon: { fontSize: 56, marginBottom: SPACING.lg },
  successTitle: {
    fontSize: FONTS.xl, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center',
  },
  successMessage: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 26, marginBottom: SPACING.xl,
  },
});

export default ForgotPasswordScreen;
