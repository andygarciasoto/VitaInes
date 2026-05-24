import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useApp } from '../../store/AppContext';
import { updateLanguage } from '../../services/firebase/userProfile';

const LanguageToggle = () => {
  const { state, setLanguage } = useApp();
  const { language, user } = state;
  const isEnglish = language === 'en';

  const toggle = async () => {
    const newLang = isEnglish ? 'es' : 'en';
    await setLanguage(newLang);
    if (user?.uid) {
      try { await updateLanguage(user.uid, newLang); } catch {}
    }
  };

  return (
    <TouchableOpacity onPress={toggle} style={styles.container} activeOpacity={0.8}>
      <View style={styles.track}>
        <View style={[styles.thumb, !isEnglish && styles.thumbRight]} />
        <Text style={[styles.label, styles.labelLeft, isEnglish && styles.labelActive]}>EN</Text>
        <Text style={[styles.label, styles.labelRight, !isEnglish && styles.labelActive]}>ES</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: 72,
    height: 32,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    left: 2,
    width: 32,
    height: 28,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    zIndex: 0,
    transition: 'left 0.2s',
  },
  thumbRight: {
    left: 36,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
    zIndex: 1,
  },
  labelActive: {
    color: COLORS.white,
  },
  labelLeft: {},
  labelRight: {},
});

export default LanguageToggle;
