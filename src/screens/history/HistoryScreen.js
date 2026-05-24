import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, getBPColor, BP_THRESHOLDS } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Card from '../../components/common/Card';
import Header from '../../components/common/Header';
import BPStatusBadge from '../../components/common/BPStatusBadge';
import { getReadingStats } from '../../services/firebase/readings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTERS = [
  { key: 'day', labelKey: 'history.filter_day', days: 1 },
  { key: 'week', labelKey: 'history.filter_week', days: 7 },
  { key: 'two_weeks', labelKey: 'history.filter_two_weeks', days: 14 },
  { key: 'month', labelKey: 'history.filter_month', days: 30 },
  { key: 'thirty', labelKey: 'history.filter_thirty_days', days: 30 },
];

const HistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const { user } = state;

  const [activeFilter, setActiveFilter] = useState('week');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async (filter) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const filterConfig = FILTERS.find((f) => f.key === filter) || FILTERS[1];
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), filterConfig.days));
      const data = await getReadingStats(user.uid, startDate, endDate);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadStats(activeFilter);
  }, [activeFilter, loadStats]);

  const buildChartData = () => {
    if (!stats?.readings || stats.readings.length === 0) return null;

    const sorted = [...stats.readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const limit = Math.min(sorted.length, 14);
    const slice = sorted.slice(-limit);

    return {
      labels: slice.map((r) => format(new Date(r.timestamp), 'MM/d')),
      datasets: [
        {
          data: slice.map((r) => r.systolic),
          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: slice.map((r) => r.diastolic),
          color: (opacity = 1) => `rgba(91, 164, 207, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: slice.map(() => BP_THRESHOLDS.normal.systolic),
          color: (opacity = 1) => `rgba(76, 175, 147, ${opacity * 0.5})`,
          strokeWidth: 1,
          strokeDashArray: [5, 5],
        },
      ],
      legend: [t('history.systolic_label'), t('history.diastolic_label'), t('history.threshold_line')],
    };
  };

  const chartData = buildChartData();

  const renderStatCard = (label, value, unit, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={t('history.title')} showBack onBack={() => navigation.goBack()} showLanguage={false} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterPill, activeFilter === filter.key && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, activeFilter === filter.key && styles.filterTextActive]}>
                  {t(filter.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={styles.loader} />
        ) : !stats || stats.count === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>{t('history.no_data')}</Text>
          </Card>
        ) : (
          <>
            {/* Stats summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {t('history.readings_count', { count: stats.count })}
              </Text>
              <View style={styles.statsRow}>
                {renderStatCard(t('history.average'), `${stats.avgSystolic}/${stats.avgDiastolic}`, t('common.mmhg'), COLORS.primary)}
                {renderStatCard(t('history.highest'), `${stats.maxSystolic}/${stats.maxDiastolic}`, t('common.mmhg'), COLORS.high)}
                {renderStatCard(t('history.lowest'), `${stats.minSystolic}/${stats.minDiastolic}`, t('common.mmhg'), COLORS.blue)}
              </View>
            </Card>

            {/* Chart */}
            {chartData && (
              <Card style={styles.chartCard} padding="sm">
                <Text style={styles.chartTitle}>Blood Pressure Trend</Text>
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 2}
                  height={220}
                  chartConfig={{
                    backgroundColor: COLORS.white,
                    backgroundGradientFrom: COLORS.white,
                    backgroundGradientTo: COLORS.white,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(76, 175, 147, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 126, 119, ${opacity})`,
                    style: { borderRadius: RADIUS.md },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                    },
                    propsForBackgroundLines: {
                      stroke: COLORS.borderLight,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withLegend
                  withVerticalLines={false}
                  fromZero={false}
                />
              </Card>
            )}

            {/* Readings list */}
            <Card style={styles.listCard}>
              <Text style={styles.listTitle}>All Readings</Text>
              {stats.readings.slice(0, 20).map((reading) => (
                <View key={reading.id} style={styles.readingRow}>
                  <View style={[styles.rowDot, { backgroundColor: getBPColor(reading.systolic, reading.diastolic) }]} />
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowBP}>{reading.systolic}/{reading.diastolic} mmHg</Text>
                    <Text style={styles.rowDate}>{format(new Date(reading.timestamp), 'EEE, MMM d · h:mm a')}</Text>
                    {reading.pulse && (
                      <Text style={styles.rowPulse}>♥ {reading.pulse} {t('common.bpm')}</Text>
                    )}
                  </View>
                  <BPStatusBadge systolic={reading.systolic} diastolic={reading.diastolic} size="sm" />
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },
  loader: { marginTop: SPACING.xxl },

  filterScroll: { marginBottom: SPACING.md, marginHorizontal: -SPACING.lg },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterPill: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },

  emptyCard: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONTS.lg, color: COLORS.textSecondary },

  summaryCard: {},
  summaryTitle: { fontSize: FONTS.md, color: COLORS.textSecondary, marginBottom: SPACING.md },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: SPACING.sm, borderLeftWidth: 4,
  },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginBottom: 2 },
  statValue: { fontSize: FONTS.lg, fontWeight: FONTS.bold },
  statUnit: { fontSize: FONTS.xs, color: COLORS.textLight },

  chartCard: { marginBottom: 0 },
  chartTitle: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: SPACING.sm, paddingHorizontal: SPACING.sm },
  chart: { borderRadius: RADIUS.md },

  listCard: {},
  listTitle: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  readingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  rowDot: { width: 12, height: 12, borderRadius: 6, marginRight: SPACING.sm },
  rowLeft: { flex: 1 },
  rowBP: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  rowDate: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  rowPulse: { fontSize: FONTS.sm, color: COLORS.textSecondary },
});

export default HistoryScreen;
