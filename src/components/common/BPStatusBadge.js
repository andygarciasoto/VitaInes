import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBPStatus, getBPColor, getBPBgColor, COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { t } from '../../localization';

const BPStatusBadge = ({ systolic, diastolic, size = 'md' }) => {
  const status = getBPStatus(systolic, diastolic);
  const color = getBPColor(systolic, diastolic);
  const bgColor = getBPBgColor(systolic, diastolic);

  const labelKey = {
    normal: 'reading.normal',
    elevated: 'reading.elevated',
    high: 'reading.high',
    crisis: 'reading.crisis',
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === 'sm' && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, size === 'sm' && styles.textSm]}>
        {t(labelKey)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  text: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
  },
  textSm: {
    fontSize: FONTS.xs,
  },
});

export default BPStatusBadge;
