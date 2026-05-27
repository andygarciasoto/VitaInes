import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Modal, Platform, Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subDays, subMonths, subYears, startOfDay, endOfDay, format,
} from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  COLORS, FONTS, SPACING, RADIUS, SHADOWS,
  getBPColor, getBPStatus, BP_THRESHOLDS,
} from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Card from '../../components/common/Card';
import Header from '../../components/common/Header';
import BPStatusBadge from '../../components/common/BPStatusBadge';
import { getReadingStats } from '../../services/firebase/readings';
import { exportPDFReport } from '../../services/pdf/reportGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2;

// ─── Filter definitions ───────────────────────────────────────────────────────
const FILTERS = [
  { key: 'today', label: 'Today',    days: 0 },
  { key: '7d',    label: '7 Days',   days: 7 },
  { key: '30d',   label: '30 Days',  days: 30 },
  { key: '90d',   label: '90 Days',  days: 90 },
  { key: '6mo',   label: '6 Mo',     months: 6 },
  { key: '1yr',   label: '1 Year',   months: 12 },
  { key: 'custom', label: 'Custom',  custom: true },
];

const STATUS_CONFIG = [
  { key: 'normal',   emoji: '✅', label: 'Normal',   color: COLORS.normal,   bg: COLORS.normalBg },
  { key: 'elevated', emoji: '⚠️',  label: 'Elevated', color: COLORS.elevated, bg: COLORS.elevatedBg },
  { key: 'high',     emoji: '🔴', label: 'High',     color: COLORS.high,     bg: COLORS.highBg },
  { key: 'crisis',   emoji: '🚨', label: 'Crisis',   color: '#8B0000',       bg: '#FFE8E8' },
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

const sampleData = (arr, max = 15) => {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
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

const StatusChip = React.memo(({ emoji, label, count, color, bg }) => (
  <View style={[styles.statusChip, { backgroundColor: bg }]}>
    <Text style={styles.statusChipEmoji}>{emoji}</Text>
    <View>
      <Text style={[styles.statusChipCount, { color }]}>{count}</Text>
      <Text style={[styles.statusChipLabel, { color }]}>{label}</Text>
    </View>
  </View>
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
  const { user, medications, recommendations, userProfile } = state;

  const [activeFilter, setActiveFilter] = useState('7d');
  const [customStart,  setCustomStart]  = useState(subDays(new Date(), 7));
  const [customEnd,    setCustomEnd]    = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async (start, end) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getReadingStats(user.uid, start, end);
      setStats(data);
      setShowAll(false);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    const filter = FILTERS.find(f => f.key === activeFilter) || FILTERS[1];
    const { start, end } = getDateRange(filter, customStart, customEnd);
    loadStats(start, end);
  }, [activeFilter, customStart, customEnd, loadStats]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const bpChartData = useMemo(() => {
    if (!stats?.readings || stats.readings.length < 2) return null;
    const sorted  = [...stats.readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sampled = sampleData(sorted, 14);
    const n = sampled.length;
    const step = Math.max(1, Math.ceil(n / 6));
    return {
      labels: sampled.map((r, i) =>
        (i % step === 0 || i === n - 1) ? format(new Date(r.timestamp), 'M/d') : ''
      ),
      datasets: [
        { data: sampled.map(r => r.systolic),                  color: () => COLORS.high,                              strokeWidth: 3 },
        { data: sampled.map(r => r.diastolic),                 color: () => COLORS.blue,                              strokeWidth: 3 },
        { data: Array(n).fill(BP_THRESHOLDS.normal.systolic),  color: o => `rgba(76,175,147,${o * 0.7})`,             strokeWidth: 1, strokeDashArray: [5, 4] },
        { data: Array(n).fill(BP_THRESHOLDS.high.systolic),    color: o => `rgba(231,76,60,${o * 0.45})`,             strokeWidth: 1, strokeDashArray: [5, 4] },
      ],
      legend: ['Systolic', 'Diastolic', 'Normal (120)', 'High (140)'],
    };
  }, [stats?.readings]);

  const pulseChartData = useMemo(() => {
    if (!stats?.readings) return null;
    const withPulse = stats.readings.filter(r => r.pulse > 0);
    if (withPulse.length < 2) return null;
    const sorted  = [...withPulse].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sampled = sampleData(sorted, 14);
    const n = sampled.length;
    const step = Math.max(1, Math.ceil(n / 6));
    return {
      labels: sampled.map((r, i) =>
        (i % step === 0 || i === n - 1) ? format(new Date(r.timestamp), 'M/d') : ''
      ),
      datasets: [{ data: sampled.map(r => r.pulse), color: () => COLORS.pink, strokeWidth: 3 }],
      legend: ['Pulse (bpm)'],
    };
  }, [stats?.readings]);

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

  // ── Date range label ───────────────────────────────────────────────────────
  const currentFilter = FILTERS.find(f => f.key === activeFilter) || FILTERS[1];
  const { start: rangeStart, end: rangeEnd } = getDateRange(currentFilter, customStart, customEnd);
  const rangeLabelStr = activeFilter === 'today'
    ? 'Today · ' + format(rangeStart, 'MMMM d, yyyy')
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
      });
    } catch (err) {
      Alert.alert('Export Failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const readingsToShow = stats?.readings
    ? (showAll ? stats.readings : stats.readings.slice(0, 25))
    : [];

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 147, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 126, 119, ${opacity})`,
    style: { borderRadius: RADIUS.md },
    propsForBackgroundLines: { stroke: COLORS.borderLight },
    propsForDots: { r: '3', strokeWidth: '1' },
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={t('history.title')}
        showBack
        onBack={() => navigation.goBack()}
        showLanguage={false}
        rightAction={
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExportPDF}
            disabled={exporting || !stats?.readings?.length}
            activeOpacity={0.8}
          >
            {exporting
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={styles.exportBtnText}>📤 PDF</Text>
            }
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Filter pills ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <FilterPill
                key={f.key}
                label={f.label}
                active={activeFilter === f.key}
                onPress={() => setActiveFilter(f.key)}
              />
            ))}
          </View>
        </ScrollView>

        {/* ── Custom date range picker ── */}
        {activeFilter === 'custom' && (
          <Card style={styles.customRangeCard} variant="flat" padding="md">
            <Text style={styles.customRangeTitle}>Select Date Range</Text>
            <View style={styles.customRangeRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dateButtonLabel}>From</Text>
                <Text style={styles.dateButtonValue}>
                  {format(customStart, 'MMM d, yyyy')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>→</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dateButtonLabel}>To</Text>
                <Text style={styles.dateButtonValue}>
                  {format(customEnd, 'MMM d, yyyy')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* ── Date range label ── */}
        <View style={styles.rangeLabelRow}>
          <Text style={styles.rangeLabelText}>📅 {rangeLabelStr}</Text>
          {stats?.count > 0 && (
            <Text style={styles.readingsCount}>{stats.count} readings</Text>
          )}
        </View>

        {/* ── Main content ── */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
        ) : !stats || stats.count === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>{t('history.no_data')}</Text>
            <Text style={styles.emptySubtitle}>Try a different time range</Text>
          </Card>
        ) : (
          <>
            {/* Stats dashboard */}
            <View style={styles.statsRow}>
              <StatCard label="Average"  value={`${stats.avgSystolic}/${stats.avgDiastolic}`} unit="mmHg"  color={COLORS.primary} />
              <StatCard label="Highest"  value={`${stats.maxSystolic}/${stats.maxDiastolic}`} unit="mmHg"  color={COLORS.high} />
              <StatCard label="Lowest"   value={`${stats.minSystolic}/${stats.minDiastolic}`} unit="mmHg"  color={COLORS.blue} />
              {avgPulse && (
                <StatCard label="Avg Pulse" value={`${avgPulse}`} unit="bpm" color={COLORS.pink} />
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
                      label={s.label}
                      count={statusCounts[s.key]}
                      color={s.color}
                      bg={s.bg}
                    />
                  ))}
                </View>
              </ScrollView>
            )}

            {/* BP Trend chart */}
            {bpChartData ? (
              <Card style={styles.chartCard} padding="sm">
                <Text style={styles.chartTitle}>📈 Blood Pressure Trend</Text>
                <Text style={styles.chartSubtitle}>
                  Red = Systolic · Blue = Diastolic · Dashed = Thresholds
                </Text>
                <LineChart
                  data={bpChartData}
                  width={CHART_WIDTH}
                  height={230}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withLegend={false}
                  withVerticalLines={false}
                  withDots
                  fromZero={false}
                />
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.high }]} />
                    <Text style={styles.legendText}>Systolic</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.blue }]} />
                    <Text style={styles.legendText}>Diastolic</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.normal, opacity: 0.7 }]} />
                    <Text style={styles.legendText}>Normal (120)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.high, opacity: 0.5 }]} />
                    <Text style={styles.legendText}>High (140)</Text>
                  </View>
                </View>
              </Card>
            ) : stats.count === 1 ? (
              <Card style={styles.chartCard} padding="md">
                <Text style={styles.chartTitle}>Latest Reading</Text>
                <View style={styles.singleReadingView}>
                  <Text style={[styles.singleBP, { color: getBPColor(stats.readings[0].systolic, stats.readings[0].diastolic) }]}>
                    {stats.readings[0].systolic}/{stats.readings[0].diastolic}
                  </Text>
                  <Text style={styles.singleUnit}>mmHg</Text>
                  <BPStatusBadge systolic={stats.readings[0].systolic} diastolic={stats.readings[0].diastolic} />
                </View>
              </Card>
            ) : null}

            {/* Pulse trend chart */}
            {pulseChartData && (
              <Card style={styles.chartCard} padding="sm">
                <Text style={styles.chartTitle}>♥ Pulse Trend</Text>
                <LineChart
                  data={pulseChartData}
                  width={CHART_WIDTH}
                  height={160}
                  chartConfig={{
                    ...chartConfig,
                    color: () => COLORS.pink,
                  }}
                  bezier
                  style={styles.chart}
                  withLegend={false}
                  withVerticalLines={false}
                  withDots
                  fromZero={false}
                />
              </Card>
            )}

            {/* Readings list */}
            <Card style={styles.listCard} padding="md">
              <Text style={styles.listTitle}>
                All Readings ({stats.count})
              </Text>
              {[...readingsToShow]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map(r => (
                  <ReadingRow key={r.id} reading={r} />
                ))}
              {!showAll && stats.readings.length > 25 && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setShowAll(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.showMoreText}>
                    Show all {stats.readings.length} readings
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
                <Text style={styles.pdfButtonText}>📤 Export PDF Report</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>

      {/* ── iOS date pickers in Modal ── */}
      {showStartPicker && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowStartPicker(false)}>
            <TouchableOpacity style={styles.pickerSheet} activeOpacity={1}>
              <View style={styles.pickerHandle} />
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={customStart}
                mode="date"
                display="inline"
                onChange={(_, d) => { if (d) setCustomStart(startOfDay(d)); }}
                maximumDate={new Date()}
                minimumDate={subYears(new Date(), 2)}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {showEndPicker && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowEndPicker(false)}>
            <TouchableOpacity style={styles.pickerSheet} activeOpacity={1}>
              <View style={styles.pickerHandle} />
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>End Date</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={customEnd}
                mode="date"
                display="inline"
                onChange={(_, d) => { if (d) setCustomEnd(endOfDay(d)); }}
                maximumDate={new Date()}
                minimumDate={subYears(new Date(), 2)}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Android / Web date pickers (native dialog, no Modal needed) */}
      {showStartPicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={customStart}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowStartPicker(false);
            if (e.type === 'set' && d) setCustomStart(startOfDay(d));
          }}
          maximumDate={new Date()}
          minimumDate={subYears(new Date(), 2)}
        />
      )}
      {showEndPicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={customEnd}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowEndPicker(false);
            if (e.type === 'set' && d) setCustomEnd(endOfDay(d));
          }}
          maximumDate={new Date()}
          minimumDate={subYears(new Date(), 2)}
        />
      )}
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

  // Charts
  chartCard: { marginBottom: SPACING.md },
  chartTitle: {
    fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary,
    marginBottom: 4, paddingHorizontal: SPACING.xs,
  },
  chartSubtitle: {
    fontSize: FONTS.xs, color: COLORS.textSecondary,
    marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs,
  },
  chart: { borderRadius: RADIUS.md, alignSelf: 'center' },

  // Chart legend
  legendRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    paddingHorizontal: SPACING.xs, marginTop: SPACING.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FONTS.xs, color: COLORS.textSecondary },

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

  // Date picker modal (iOS)
  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xxl,
  },
  pickerHandle: {
    width: 40, height: 5, borderRadius: 3, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerTitle:  { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  pickerCancel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  pickerDone:   { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.primary },
});

export default HistoryScreen;
