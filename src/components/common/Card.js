import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

const Card = ({ children, style, variant = 'default', padding = 'md' }) => {
  const paddingSize = { sm: SPACING.sm, md: SPACING.md, lg: SPACING.lg };

  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'flat' && styles.flat,
        { padding: paddingSize[padding] || SPACING.md },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  elevated: {
    ...SHADOWS.md,
  },
  flat: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default Card;
