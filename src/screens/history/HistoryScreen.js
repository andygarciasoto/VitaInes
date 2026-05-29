import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import BPChart from '../../components/charts/BPChart';
import PulseChart from '../../components/charts/PulseChart';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subDays, subMonths, subYears, startOfDay, endOfDay, format,
} from 'date-fns';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS,
  getBPColor, getBPStatus,
} from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import CalendarPicker from '../../components/common/CalendarPicker';
import Card from '../../components/common/Card';
import Header from '../../components/common/Header';
import BPStatusBadge from '../../components/common/BPStatusBadge';
import { getReadingStats } from '../../services/firebase/readings';
import { exportPDFReport } from '../../services/pdf/reportGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2;

// ─── Filter definitions ───────────────────────────────────────────────────────
const FILTERS = [
  { key: 'today',  labelKey: 'history.filter_today',    days: 0 },
  { key: '7d',     labelKey: 'history.filter_7_days',   days: 7 },
  { key: '30d',    labelKey: 'history.filter_30_days',  days: 30 },
  { key: '90d',    labelKey: 'history.filter_90_days',  days: 90 },
  { key: '6mo',    labelKey: 'history.filter_6_months', months: 6 },
  { key: '1yr',    labelKey: 'history.filter_1_year',   months: 12 },
  { key: 'custom', labelKey: 'history.filter_custom',   custom: true },
];

const STATUS_CONFIG = [
  { key: 'normal',   emoji: '✅', labelKey: 'reading.normal',   color: COLORS.normal,   bg: COLORS.normalBg },
  { key: 'elevated', emoji: '⚠️',  labelKey: 'reading.elevated', color: COLORS.elevated, bg: COLORS.elevatedBg },
  { key: 'high',     emoji: '🔴', labelKey: 'reading.high',     color: COLORS.high,     bg: COLORS.highBg },
  { key: 'crisis',   emoji: '🚨', labelKey: 'reading.crisis',   color: '#8B0000',       bg: '#FFE8E8' },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const getDateRange = (filter, customStart, customEnd) => {
  const now = new Date();
  if (filter.custom) {
    return {
      start: startOfDay(customStart || subDays(now, 7)),
      end:   endOfDay(customEnd || now),
    };
  }
  if (filter.days === 0) return { start: startOfDay(now), end: endOfDay(now) };
  if (filter.days)       return { start: startOfDay(subDays(now, filter.days)), end: endOfDay(now) };
  if (filter.months)     return { start: startOfDay(subMonths(now, filter.months)), end: endOfDay(now) };
  return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
};

const computeStatusCounts = (readings) => {
  const c = { normal: 0, elevated: 0, high: 0, crisis: 0 };
  readings.forEach(r => { c[getBPStatus(r.systolic, r.diastolic)]++; });
  return c;
};

// ─── Sub-components (module scope — never remount on parent re-render) ────────
const FilterPill = React.memo(({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterPill, active && styles.filterPillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
));

const StatCard = React.memo(({ label, value, unit, color }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

const StatusChip = React.memo(({ emoji, label, count, color, bg, active, dimmed, onPress }) => (
  <TouchableOpacity
    style={[
      styles.statusChip,
      { backgroundColor: bg },
      active  && { borderWidth: 2.5, borderColor: color },
      dimmed  && styles.statusChipDimmed,
    ]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={styles.statusChipEmoji}>{emoji}</Text>
    <View>
      <Text style={[styles.statusChipCount, { color }]}>{count}</Text>
      <Text style={[styles.statusChipLabel, { color }]}>{label}</Text>
    </View>
  </TouchableOpacity>
));

const ReadingRow = React.memo(({ reading }) => {
  const bpColor = getBPColor(reading.systolic, reading.diastolic);
  const dateStr = format(new Date(reading.timestamp), 'EEE, MMM d · h:mm a');
  return (
    <View style={styles.readingRow}>
      <View style={[styles.rowBar, { backgroundColor: bpColor }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowBP, { color: bpColor }]}>
            {reading.systolic}/{reading.diastolic}
            <Text style={styles.rowBPUnit}> mmHg</Text>
          </Text>
          <BPStatusBadge systolic={reading.systolic} diastolic={reading.diastolic} size="sm" />
        </View>
        <Text style={styles.rowDate}>{dateStr}</Text>
        {reading.pulse > 0 && (
          <Text style={styles.rowPulse}>♥ {reading.pulse} bpm</Text>
        )}
        {reading.notes ? (
          <Text style={styles.rowNotes} numberOfLines={2}>{reading.notes}</Text>
        ) : null}
      </View>
    </View>
  );
});

// ─── Main screen ─────────────────────────────────────────────────────────────
const HistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const { user, medications, recommendations, userProfile, language } = state;

  const [activeFilter, setActiveFilter] = useState('7d');
  const [customStart,  setCustomStart]  = useState(subDays(new Date(), 7));
  const [customEnd,    setCustomEnd]    = useState(new Date());
  const [showCalendar, setShowCalendar] = useState('none'); // 'none' | 'start' | 'end'
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null); // null | 'normal' | 'elevated' | 'high' | 'crisis'

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async (start, end) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getReadingStats(user.uid, start, end);
      setStats(data);
      setShowAll(false);
      setStatusFilter(null);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Reload on screen focus and when filter changes
  useFocusEffect(
    useCallback(() => {
      const filter = FILTERS.find(f => f.key === activeFilter) || FILTERS[1];
      const { start, end } = getDateRange(filter, customStart, customEnd);
      loadStats(start, end);
    }, [activeFilter, customStart, customEnd, loadStats])
  );

  // useFocusEffect only re-runs on focus transitions, NOT on dep changes while focused.
  // This explicit effect handles custom date updates while the screen is already visible.
  useEffect(() => {
    if (activeFilter !== 'custom') return;
    const { start, end } = getDateRange({ custom: true }, customStart, customEnd);
    loadStats(start, end);
  }, [customStart, customEnd, activeFilter, loadStats]);

  const statusCounts = useMemo(
    () => stats?.readings ? computeStatusCounts(stats.readings) : null,
    [stats?.readings]
  );

  const avgPulse = useMemo(() => {
    if (!stats?.readings) return null;
    const arr = stats.readings.filter(r => r.pulse > 0);
    if (!arr.length) return null;
    return Math.round(arr.reduce((s, r) => s + r.pulse, 0) / arr.length);
  }, [stats?.readings]);

  // Readings filtered by the active status chip (null = show all)
  const filteredReadings = useMemo(() => {
    if (!stats?.readings) return [];
    if (!statusFilter) return stats.readings;
    return stats.readings.filter(r => getBPStatus(r.systolic, r.diastolic) === statusFilter);
  }, [stats?.readings, statusFilter]);

  // ── Date range label ───────────────────────────────────────────────────────
  const currentFilter = FILTERS.find(f => f.key === activeFilter) || FILTERS[1];
  const { start: rangeStart, end: rangeEnd } = getDateRange(currentFilter, customStart, customEnd);
  const rangeLabelStr = activeFilter === 'today'
    ? t('common.today') + ' · ' + format(rangeStart, 'MMMM d, yyyy')
    : `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`;

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (exporting || !stats?.readings?.length) return;
    setExporting(true);
    try {
      await exportPDFReport({
        readings:        stats.readings,
        stats,
        medications,
        recommendations,
        profile:         userProfile,
        dateRange:       { start: rangeStart, end: rangeEnd },
        language,
      });
    } catch (err) {
      Alert.alert('Export Failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const readingsToShow = showAll ? filteredReadings : filteredReadings.slice(0, 25);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={t('history.title')}
        showBack
        onBack={() => navigation.goBack()}
        showLanguage
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Filter pills ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <FilterPill
                key={f.key}
                label={t(f.labelKey)}
                active={activeFilter === f.key}
                onPress={() => setActiveFilter(f.key)}
              />
            ))}
          </View>
        </ScrollView>

        {/* ── Custom date range picker ── */}
        {activeFilter === 'custom' && (
          <Card style={styles.customRangeCard} variant="flat" padding="md">
            <Text style={styles.customRangeTitle}>{t('history.select_range')}</Text>
            <View style={styles.customRangeRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowCalendar('start')}
                activeOpacity={0.8}
              >
                <Text style={styles.dateButtonLabel}>{t('history.custom_start')}</Text>
                <Text style={styles.dateButtonValue}>{format(customStart, 'MMM d, yyyy')}</Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>→</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowCalendar('end')}
                activeOpacity={0.8}
              >
                <Text style={styles.dateButtonLabel}>{t('history.custom_end')}</Text>
                <Text style={styles.dateButtonValue}>{format(customEnd, 'MMM d, yyyy')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* ── Date range label ── */}
        <View style={styles.rangeLabelRow}>
          <Text style={styles.rangeLabelText}>📅 {rangeLabelStr}</Text>
          {stats?.count > 0 && (
            <Text style={styles.readingsCount}>{t('history.readings_count', { count: stats.count })}</Text>
          )}
        </View>

        {/* ── Main content ── */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
        ) : !stats || stats.count === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>{t('history.no_data')}</Text>
            <Text style={styles.emptySubtitle}>{t('history.try_different')}</Text>
          </Card>
        ) : (
          <>
            {/* Stats dashboard */}
            <View style={styles.statsRow}>
              <StatCard label={t('history.average')}  value={`${stats.avgSystolic}/${stats.avgDiastolic}`} unit="mmHg"  color={COLORS.primary} />
              <StatCard label={t('history.highest')}  value={`${stats.maxSystolic}/${stats.maxDiastolic}`} unit="mmHg"  color={COLORS.high} />
              <StatCard label={t('history.lowest')}   value={`${stats.minSystolic}/${stats.minDiastolic}`} unit="mmHg"  color={COLORS.blue} />
              {avgPulse && (
                <StatCard label={t('history.avg_pulse')} value={`${avgPulse}`} unit="bpm" color={COLORS.pink} />
              )}
            </View>

            {/* Status distribution */}
            {statusCounts && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                <View style={styles.statusRow}>
                  {STATUS_CONFIG.map(s => (
                    <StatusChip
                      key={s.key}
                      emoji={s.emoji}
                      label={t(s.labelKey)}
                      count={statusCounts[s.key]}
                      color={s.color}
                      bg={s.bg}
                      active={statusFilter === s.key}
                      dimmed={statusFilter !== null && statusFilter !== s.key}
                      onPress={() => {
                        setStatusFilter(prev => prev === s.key ? null : s.key);
                        setShowAll(false);
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            )}

            {/* BP Trend chart */}
            {filteredReadings.length >= 2 ? (
              <Card style={styles.chartCard} padding="sm">
                <Text style={styles.chartTitle}>📈 {t('history.bp_trend')}</Text>
                <BPChart
                  readings={filteredReadings}
                  width={CHART_WIDTH}
                  language={language}
                />
              </Card>
            ) : filteredReadings.length === 1 ? (
              <Card style={styles.chartCard} padding="md">
                <Text style={styles.chartTitle}>{t('history.latest_reading')}</Text>
                <View style={styles.singleReadingView}>
                  <Text style={[styles.singleBP, { color: getBPColor(filteredReadings[0].systolic, filteredReadings[0].diastolic) }]}>
                    {filteredReadings[0].systolic}/{filteredReadings[0].diastolic}
                  </Text>
                  <Text style={styles.singleUnit}>mmHg</Text>
                  <BPStatusBadge systolic={filteredReadings[0].systolic} diastolic={filteredReadings[0].diastolic} />
                </View>
              </Card>
            ) : statusFilter ? (
              <Card style={styles.chartCard} padding="md">
                <Text style={[styles.emptyTitle, { textAlign: 'center', paddingVertical: SPACING.lg }]}>
                  No {STATUS_CONFIG.find(s => s.key === statusFilter)?.emoji} readings in this period
                </Text>
              </Card>
            ) : null}

            {/* Pulse trend chart */}
            {filteredReadings.some(r => r.pulse > 0) && (
              <Card style={styles.chartCard} padding="sm">
                <Text style={styles.chartTitle}>♥ {t('history.pulse_trend')}</Text>
                <PulseChart
                  readings={filteredReadings}
                  width={CHART_WIDTH}
                  language={language}
                />
              </Card>
            )}

            {/* Readings list */}
            <Card style={styles.listCard} padding="md">
              <Text style={styles.listTitle}>
                {statusFilter
                  ? `${STATUS_CONFIG.find(s => s.key === statusFilter)?.emoji} ${t(STATUS_CONFIG.find(s => s.key === statusFilter)?.labelKey)} (${filteredReadings.length})`
                  : `${t('history.all_readings')} (${stats.count})`
                }
              </Text>
              {[...readingsToShow]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map(r => (
                  <ReadingRow key={r.id} reading={r} />
                ))}
              {!showAll && filteredReadings.length > 25 && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setShowAll(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.showMoreText}>
                    {t('history.show_more', { count: filteredReadings.length })}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>

            {/* PDF Export button (bottom) */}
            <TouchableOpacity
              style={[styles.pdfButton, exporting && styles.pdfButtonDisabled]}
              onPress={handleExportPDF}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.pdfButtonText}>📤 {t('history.export_pdf')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>

      {/* ── Calendar picker — works on web, iOS, and Android ── */}
      <CalendarPicker
        visible={showCalendar !== 'none'}
        title={showCalendar === 'start' ? t('history.custom_start') : t('history.custom_end')}
        value={showCalendar === 'start' ? customStart : customEnd}
        onSelect={(date) => {
          if (showCalendar === 'start') {
            setCustomStart(startOfDay(date));
          } else {
            setCustomEnd(endOfDay(date));
          }
        }}
        onClose={() => setShowCalendar('none')}
        maxDate={showCalendar === 'start' ? customEnd : new Date()}
        minDate={showCalendar === 'end'   ? customStart : subYears(new Date(), 2)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },
  loader: { marginTop: SPACING.xxl * 2 },

  // Export button in header
  exportBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    minWidth: 72, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: COLORS.white, fontSize: FONTS.sm, fontWeight: FONTS.semiBold },

  // Filters
  filterScroll: { marginBottom: SPACING.sm, marginHorizontal: -SPACING.lg },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterPill: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white, minWidth: 60, alignItems: 'center',
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },

  // Custom date range
  customRangeCard: { marginBottom: SPACING.sm },
  customRangeTitle: {
    fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  customRangeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dateButton: {
    flex: 1, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  dateButtonLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary },
  dateButtonValue: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.primary, marginTop: 2 },
  dateSeparator: { fontSize: FONTS.lg, color: COLORS.textLight },

  // Range label
  rangeLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  rangeLabelText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  readingsCount:  { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.primary },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: SPACING.xxl * 1.5, marginTop: SPACING.lg },
  emptyEmoji:    { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle:    { fontSize: FONTS.lg, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  emptySubtitle: { fontSize: FONTS.sm, color: COLORS.textLight, marginTop: SPACING.xs },

  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 70, backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: SPACING.sm, alignItems: 'center', borderTopWidth: 4, ...SHADOWS.sm,
  },
  statValue: { fontSize: FONTS.md, fontWeight: FONTS.bold, textAlign: 'center' },
  statUnit:  { fontSize: FONTS.xs, color: COLORS.textLight },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  // Status chips
  statusScroll: { marginBottom: SPACING.md, marginHorizontal: -SPACING.lg },
  statusRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, minWidth: 90,
  },
  statusChipEmoji: { fontSize: 20 },
  statusChipCount: { fontSize: FONTS.lg, fontWeight: FONTS.bold },
  statusChipLabel: { fontSize: FONTS.xs, fontWeight: FONTS.medium },
  statusChipDimmed: { opacity: 0.45 },

  // Charts
  chartCard: { marginBottom: SPACING.md },
  chartTitle: {
    fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary,
    marginBottom: 4, paddingHorizontal: SPACING.xs,
  },
  // Single reading (when only 1 point)
  singleReadingView: { alignItems: 'center', paddingVertical: SPACING.md },
  singleBP:   { fontSize: FONTS.xxl, fontWeight: FONTS.bold },
  singleUnit: { fontSize: FONTS.sm, color: COLORS.textLight, marginBottom: SPACING.sm },

  // Readings list
  listCard:  { marginBottom: SPACING.md },
  listTitle: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: SPACING.sm },

  readingRow: { flexDirection: 'row', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  rowBar:  { width: 5, borderRadius: 3, marginRight: SPACING.sm, marginVertical: 2 },
  rowBody: { flex: 1 },
  rowTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  rowBP:   { fontSize: FONTS.md, fontWeight: FONTS.bold },
  rowBPUnit: { fontSize: FONTS.xs, fontWeight: FONTS.regular, color: COLORS.textSecondary },
  rowDate: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  rowPulse: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  rowNotes: { fontSize: FONTS.sm, color: COLORS.textLight, fontStyle: 'italic', marginTop: 2 },

  showMoreBtn: {
    alignItems: 'center', paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  showMoreText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },

  // PDF button
  pdfButton: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    padding: SPACING.md + 4, alignItems: 'center',
    marginBottom: SPACING.md, ...SHADOWS.md,
  },
  pdfButtonDisabled: { opacity: 0.6 },
  pdfButtonText: { color: COLORS.white, fontSize: FONTS.md, fontWeight: FONTS.semiBold },

});

export default HistoryScreen;
