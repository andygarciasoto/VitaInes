export const COLORS = {
  // Primary palette
  white: '#FFFFFF',
  background: '#F7FAF8',
  cardBackground: '#FFFFFF',

  // Green family
  primary: '#4CAF93',
  primaryLight: '#E8F5EF',
  primaryDark: '#357A65',

  // Blue family
  blue: '#5BA4CF',
  blueLight: '#E8F2FA',
  blueDark: '#3A7BAE',

  // Pink/accent
  pink: '#F4A7B9',
  pinkLight: '#FDF0F4',

  // Status colors
  normal: '#4CAF93',
  elevated: '#F5A623',
  high: '#E74C3C',
  normalBg: '#E8F5EF',
  elevatedBg: '#FEF6E7',
  highBg: '#FDECEA',

  // Text
  textPrimary: '#1A2E25',
  textSecondary: '#6B7E77',
  textLight: '#A8B8B1',
  textOnPrimary: '#FFFFFF',

  // Border
  border: '#E2EDE8',
  borderLight: '#F0F5F2',

  // Shadow
  shadow: 'rgba(76, 175, 147, 0.12)',

  // Overlay
  overlay: 'rgba(26, 46, 37, 0.5)',
};

export const FONTS = {
  // Font families (Nunito — rounded, wellness-friendly)
  family:         'Nunito_400Regular',
  familyMedium:   'Nunito_500Medium',
  familySemiBold: 'Nunito_600SemiBold',
  familyBold:     'Nunito_700Bold',

  // Sizes — large for elderly users
  xs: 14,
  sm: 16,
  md: 18,
  lg: 22,
  xl: 26,
  xxl: 32,
  display: 40,

  // Weights (kept for numeric usage)
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Blood pressure thresholds (mmHg)
export const BP_THRESHOLDS = {
  normal: { systolic: 120, diastolic: 80 },
  elevated: { systolic: 130, diastolic: 80 },
  high: { systolic: 140, diastolic: 90 },
  crisis: { systolic: 180, diastolic: 120 },
};

export const getBPStatus = (systolic, diastolic) => {
  if (systolic >= BP_THRESHOLDS.crisis.systolic || diastolic >= BP_THRESHOLDS.crisis.diastolic) {
    return 'crisis';
  }
  if (systolic >= BP_THRESHOLDS.high.systolic || diastolic >= BP_THRESHOLDS.high.diastolic) {
    return 'high';
  }
  if (systolic >= BP_THRESHOLDS.elevated.systolic || diastolic >= BP_THRESHOLDS.elevated.diastolic) {
    return 'elevated';
  }
  return 'normal';
};

export const getBPColor = (systolic, diastolic) => {
  const status = getBPStatus(systolic, diastolic);
  switch (status) {
    case 'crisis':
    case 'high': return COLORS.high;
    case 'elevated': return COLORS.elevated;
    default: return COLORS.normal;
  }
};

export const getBPBgColor = (systolic, diastolic) => {
  const status = getBPStatus(systolic, diastolic);
  switch (status) {
    case 'crisis':
    case 'high': return COLORS.highBg;
    case 'elevated': return COLORS.elevatedBg;
    default: return COLORS.normalBg;
  }
};
