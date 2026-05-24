import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const NumberInput = ({ value, onChange, label, hint, min = 0, max = 999, unit, error }) => {
  const numValue = parseInt(value, 10) || 0;

  const increment = () => {
    if (numValue < max) onChange(String(numValue + 1));
  };

  const decrement = () => {
    if (numValue > min) onChange(String(numValue - 1));
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TouchableOpacity onPress={decrement} style={styles.btn} activeOpacity={0.7}>
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.valueContainer}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num) && num >= min && num <= max) {
                onChange(String(num));
              } else if (text === '' || text === '0') {
                onChange('');
              }
            }}
            keyboardType="number-pad"
            maxLength={3}
            textAlign="center"
            selectTextOnFocus
          />
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </View>
        <TouchableOpacity onPress={increment} style={styles.btn} activeOpacity={0.7}>
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  hint: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: COLORS.high,
  },
  btn: {
    width: 60,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  btnText: {
    fontSize: 28,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    lineHeight: 32,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: FONTS.display,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    width: '100%',
    height: 72,
    paddingHorizontal: SPACING.sm,
  },
  unit: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONTS.sm,
    color: COLORS.high,
    marginTop: SPACING.xs,
  },
});

export default NumberInput;
