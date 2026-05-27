import React, { useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';

/**
 * NumberInput — allows direct keyboard typing AND ± buttons.
 *
 * Key design decisions:
 * - Range validation happens ONLY on blur or save, never while typing.
 *   This lets a user type "1" → "12" → "120" without being blocked mid-entry.
 * - Only digits are accepted; letters, symbols, and decimals are stripped.
 * - ± buttons clamp to [min, max] immediately for fine-tuning.
 * - selectTextOnFocus so the user can start typing to replace the value.
 */
const NumberInput = ({
  value,
  onChange,
  onBlur,
  label,
  hint,
  min = 0,
  max = 999,
  unit,
  error,
  placeholder = '—',
  autoFocus = false,
  inputRef: externalRef,
  onSubmitEditing,
  returnKeyType = 'done',
}) => {
  const internalRef = useRef(null);
  const ref = externalRef || internalRef;
  const numValue = parseInt(value, 10);

  // Strip everything except digits; no clamping during live typing
  const handleChangeText = (raw) => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits === '') {
      onChange('');
      return;
    }
    // Remove accidental leading zeros ("007" → "7")
    const cleaned = String(parseInt(digits, 10));
    // Hard-cap at 3 digits so the field never overflows visually
    if (cleaned.length <= 3) onChange(cleaned);
  };

  // On blur: clamp to valid range if the user left an out-of-bounds number
  const handleBlur = () => {
    if (value !== '' && !isNaN(numValue)) {
      if (numValue < min) onChange(String(min));
      else if (numValue > max) onChange(String(max));
    }
    onBlur?.();
  };

  const handleDecrement = () => {
    const base = isNaN(numValue) ? min : numValue;
    if (base > min) onChange(String(base - 1));
  };

  const handleIncrement = () => {
    const base = isNaN(numValue) ? min : numValue;
    if (base < max) onChange(String(base + 1));
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={[styles.card, error && styles.cardError]}>
        {/* ─ Decrement ─ */}
        <TouchableOpacity
          style={styles.adjBtn}
          onPress={handleDecrement}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Text style={styles.adjText}>−</Text>
        </TouchableOpacity>

        {/* ─ Typing area ─ */}
        <TouchableOpacity
          style={styles.inputArea}
          activeOpacity={1}
          onPress={() => ref.current?.focus()}
        >
          <TextInput
            ref={ref}
            style={styles.input}
            value={value}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            keyboardType="number-pad"
            returnKeyType={returnKeyType}
            maxLength={3}
            selectTextOnFocus
            placeholder={placeholder}
            placeholderTextColor={COLORS.textLight}
            autoFocus={autoFocus}
            onSubmitEditing={onSubmitEditing}
            // Prevent any non-numeric characters from appearing
            textContentType="none"
            autoComplete="off"
            autoCorrect={false}
          />
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </TouchableOpacity>

        {/* ─ Increment ─ */}
        <TouchableOpacity
          style={styles.adjBtn}
          onPress={handleIncrement}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Text style={styles.adjText}>+</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
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

  // Card wrapping the whole control
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardError: {
    borderColor: COLORS.high,
    backgroundColor: '#FFF8F8',
  },

  // ± buttons
  adjBtn: {
    width: 56,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  adjText: {
    fontSize: 30,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    lineHeight: 34,
  },

  // Centre typing area
  inputArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  input: {
    width: '100%',
    height: 80,
    fontSize: FONTS.display,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xs,
    // Transparent background so the card bg shows through
    backgroundColor: 'transparent',
  },
  unit: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  errorIcon: {
    fontSize: FONTS.sm,
    marginRight: 4,
    color: COLORS.high,
  },
  errorText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.high,
    lineHeight: 18,
  },
});

export default NumberInput;
