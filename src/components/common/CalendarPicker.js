import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions,
} from 'react-native';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameDay, isAfter, isBefore, startOfDay,
} from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Compute a cell size that fits 7 columns in the available sheet width on any device
const SCREEN_W   = Dimensions.get('window').width;
const SHEET_W    = Math.min(SCREEN_W - SPACING.md * 2, 340);
const INNER_W    = SHEET_W - SPACING.md * 2;
const CELL       = Math.floor(INNER_W / 7);

const CalendarPicker = ({ visible, title, value, onSelect, onClose, minDate, maxDate }) => {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value || new Date()));

  // Jump to the selected month whenever the picker opens or the value changes
  useEffect(() => {
    if (visible) setViewMonth(startOfMonth(value || new Date()));
  }, [visible, value]);

  const cells = useMemo(() => {
    const first  = startOfMonth(viewMonth);
    const blanks = Array(first.getDay()).fill(null);
    const days   = eachDayOfInterval({ start: first, end: endOfMonth(viewMonth) });
    return [...blanks, ...days];
  }, [viewMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        {/* Inner touchable so taps on the sheet don't bubble up and close it */}
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>

          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : null}

          {/* ── Month navigation ───────────────────────────── */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setViewMonth(v => subMonths(v, 1))}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => setViewMonth(v => addMonths(v, 1))}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Weekday header row ─────────────────────────── */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map(d => (
              <View key={d} style={styles.cell}>
                <Text style={styles.weekText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* ── Day grid ──────────────────────────────────── */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`blank-${idx}`} style={styles.cell} />;

              const sel = value && isSameDay(day, value);
              const isToday = isSameDay(day, new Date());
              const disabled =
                (minDate && isBefore(startOfDay(day), startOfDay(minDate))) ||
                (maxDate && isAfter(startOfDay(day),  startOfDay(maxDate)));

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.cell,
                    sel     && styles.cellSelected,
                    isToday && !sel && styles.cellToday,
                  ]}
                  onPress={() => { if (!disabled) { onSelect(day); onClose(); } }}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayText,
                    sel      && styles.daySelected,
                    isToday  && !sel && styles.dayToday,
                    disabled && styles.dayDisabled,
                  ]}>
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Cancel ────────────────────────────────────── */}
          <TouchableOpacity style={styles.cancelRow} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    width: SHEET_W,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  // Navigation row
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  navArrow: {
    fontSize: 30,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
    lineHeight: 34,
  },
  monthLabel: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Weekday headers
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Individual cell (used for both header days and date numbers)
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: COLORS.primary,
    borderRadius: CELL / 2,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: CELL / 2,
  },

  // Day number text
  dayText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  daySelected: {
    color: COLORS.white,
    fontWeight: FONTS.bold,
  },
  dayToday: {
    color: COLORS.primary,
    fontWeight: FONTS.semiBold,
  },
  dayDisabled: {
    color: COLORS.textLight,
    opacity: 0.35,
  },

  // Weekday header text
  weekText: {
    fontSize: 12,
    fontWeight: FONTS.semiBold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },

  // Cancel button
  cancelRow: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cancelText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
});

export default CalendarPicker;
