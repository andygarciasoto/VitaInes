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
    <TouchableOpacity onPress={toggle} activeOpacity={0.75} style={styles.container}>
      <View style={styles.track}>
        {/* Active side highlight */}
        <View style={[styles.thumb, !isEnglish && styles.thumbRight]} />
        <Text style={[styles.sideLabel, isEnglish && styles.sideLabelActive]}>EN</Text>
        <Text style={[styles.sideLabel, !isEnglish && styles.sideLabelActive]}>ES</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.xs },
  track: {
    width: 80, height: 36,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    borderWidth: 2, borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    left: 2, top: 2,
    width: 36, height: 28,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  thumbRight: { left: 40 },
  sideLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sm,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    zIndex: 1,
  },
  sideLabelActive: { color: COLORS.white },
});

export default LanguageToggle;
