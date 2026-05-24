import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, getBPColor, getBPBgColor } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Card from '../../components/common/Card';
import BPStatusBadge from '../../components/common/BPStatusBadge';
import LanguageToggle from '../../components/common/LanguageToggle';
import { getRecentReadings } from '../../services/firebase/readings';
import { getMedications } from '../../services/firebase/medications';
import { generateRecommendations, getCategoryIcon } from '../../services/ai/recommendations';
import { format, isToday, isYesterday } from 'date-fns';

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { user, userProfile, language, recentReadings, medications, recommendations } = state;

  const [refreshing, setRefreshing] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const greeting = () => {
    const hour = new Date().getHours();
    const name = userProfile?.displayName || user?.displayName || '';
    const firstName = name.split(' ')[0];
    const greetKey = hour < 12 ? 'home.good_morning' : hour < 18 ? 'home.good_afternoon' : 'home.good_evening';
    return `${t(greetKey)}${firstName ? `, ${firstName}` : ''}`;
  };

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      dispatch({ type: 'SET_READINGS_LOADING', payload: true });
      const [readings, meds] = await Promise.all([
        getRecentReadings(user.uid, 20),
        getMedications(user.uid),
      ]);

      dispatch({ type: 'SET_RECENT_READINGS', payload: readings });
      dispatch({ type: 'SET_MEDICATIONS', payload: meds });

      if (readings.length > 0) {
        dispatch({ type: 'SET_LATEST_READING', payload: readings[0] });
        setLoadingRecs(true);
        const recs = await generateRecommendations(readings, language);
        dispatch({ type: 'SET_RECOMMENDATIONS', payload: recs });
        setLoadingRecs(false);
      }
    } catch {
      dispatch({ type: 'SET_READINGS_LOADING', payload: false });
    }
  }, [user?.uid, language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatReadingDate = (date) => {
    if (!date) return '';
    if (isToday(date)) return t('common.today');
    if (isYesterday(date)) return t('common.yesterday');
    return format(date, 'MMM d');
  };

  const todayReadingsCount = recentReadings.filter((r) =>
    r.timestamp && isToday(new Date(r.timestamp))
  ).length;

  const activeMeds = medications.filter((m) => m.active);
  const latestReading = recentReadings[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primaryLight, COLORS.white]} style={styles.headerGradient}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting()}</Text>
            {todayReadingsCount > 0 && (
              <Text style={styles.subGreeting}>
                {t('home.readings_today', { count: todayReadingsCount })}
              </Text>
            )}
          </View>
          <LanguageToggle />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Latest Reading Card */}
        <Card variant="elevated" style={styles.readingCard}>
          <Text style={styles.sectionLabel}>{t('home.last_reading')}</Text>
          {latestReading ? (
            <View>
              <View style={styles.bpRow}>
                <View style={styles.bpMain}>
                  <Text style={[styles.bpValue, { color: getBPColor(latestReading.systolic, latestReading.diastolic) }]}>
                    {latestReading.systolic}/{latestReading.diastolic}
                  </Text>
                  <Text style={styles.bpUnit}>{t('common.mmhg')}</Text>
                </View>
                <View style={styles.bpRight}>
                  <BPStatusBadge systolic={latestReading.systolic} diastolic={latestReading.diastolic} />
                  {latestReading.pulse && (
                    <Text style={styles.pulseText}>♥ {latestReading.pulse} {t('common.bpm')}</Text>
                  )}
                  <Text style={styles.readingTime}>{formatReadingDate(latestReading.timestamp)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noReadingContainer}>
              <Text style={styles.noReadingEmoji}>📊</Text>
              <Text style={styles.noReadingText}>{t('home.no_readings')}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => navigation.navigate('AddReading')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.logBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.logBtnText}>+ {t('home.add_reading')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Card>

        {/* AI Insight Card */}
        {(recommendations.length > 0 || loadingRecs) && (
          <Card style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.sectionLabel}>✨ {t('home.ai_insight')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Insights')}>
                <Text style={styles.viewAll}>{t('home.view_all')}</Text>
              </TouchableOpacity>
            </View>
            {loadingRecs ? (
              <ActivityIndicator color={COLORS.primary} style={{ padding: SPACING.md }} />
            ) : recommendations[0] ? (
              <View style={styles.insightContent}>
                <Text style={styles.insightIcon}>{getCategoryIcon(recommendations[0].category)}</Text>
                <Text style={styles.insightText}>{recommendations[0].text}</Text>
              </View>
            ) : null}
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[COLORS.blueLight, '#D4E8F5']} style={styles.quickActionGrad}>
              <Text style={styles.quickActionIcon}>📈</Text>
              <Text style={styles.quickActionLabel}>{t('nav.history')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Medications')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[COLORS.pinkLight, '#FAE4EC']} style={styles.quickActionGrad}>
              <Text style={styles.quickActionIcon}>💊</Text>
              <Text style={styles.quickActionLabel}>{t('nav.medications')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Medications Due */}
        {activeMeds.length > 0 && (
          <Card style={styles.medsCard}>
            <View style={styles.medsHeader}>
              <Text style={styles.sectionLabel}>💊 {t('home.medications_due')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Medications')}>
                <Text style={styles.viewAll}>{t('home.view_all')}</Text>
              </TouchableOpacity>
            </View>
            {activeMeds.slice(0, 3).map((med) => (
              <View key={med.id} style={styles.medRow}>
                <View style={styles.medDot} />
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDose}>{med.dosage}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Recent readings list */}
        {recentReadings.length > 1 && (
          <Card style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionLabel}>🕒 Recent Readings</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={styles.viewAll}>{t('home.view_all')}</Text>
              </TouchableOpacity>
            </View>
            {recentReadings.slice(0, 5).map((reading) => (
              <View key={reading.id} style={styles.recentRow}>
                <View style={[styles.recentDot, { backgroundColor: getBPColor(reading.systolic, reading.diastolic) }]} />
                <Text style={styles.recentBP}>{reading.systolic}/{reading.diastolic}</Text>
                <Text style={styles.recentDate}>{formatReadingDate(reading.timestamp)}</Text>
                <BPStatusBadge systolic={reading.systolic} diastolic={reading.diastolic} size="sm" />
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerGradient: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: SPACING.md },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  subGreeting: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, gap: SPACING.md },
  sectionLabel: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },

  // Reading card
  readingCard: {},
  bpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  bpMain: { flexDirection: 'row', alignItems: 'flex-end' },
  bpValue: { fontSize: FONTS.display + 8, fontWeight: FONTS.bold, lineHeight: FONTS.display + 12 },
  bpUnit: { fontSize: FONTS.md, color: COLORS.textSecondary, marginLeft: SPACING.xs, marginBottom: 8 },
  bpRight: { alignItems: 'flex-end', gap: SPACING.xs },
  pulseText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  readingTime: { fontSize: FONTS.sm, color: COLORS.textLight },
  noReadingContainer: { alignItems: 'center', paddingVertical: SPACING.lg },
  noReadingEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  noReadingText: { fontSize: FONTS.md, color: COLORS.textSecondary },

  logBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  logBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  logBtnText: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.white },

  // Insight card
  insightCard: {},
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.medium },
  insightContent: { flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.sm },
  insightIcon: { fontSize: 24, marginRight: SPACING.sm },
  insightText: { flex: 1, fontSize: FONTS.md, color: COLORS.textPrimary, lineHeight: 24 },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: SPACING.md },
  quickAction: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  quickActionGrad: { padding: SPACING.lg, alignItems: 'center' },
  quickActionIcon: { fontSize: 32, marginBottom: SPACING.xs },
  quickActionLabel: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },

  // Meds card
  medsCard: {},
  medsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  medDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: SPACING.sm },
  medName: { flex: 1, fontSize: FONTS.md, color: COLORS.textPrimary, fontWeight: FONTS.medium },
  medDose: { fontSize: FONTS.sm, color: COLORS.textSecondary },

  // Recent card
  recentCard: {},
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  recentBP: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, flex: 1 },
  recentDate: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginRight: SPACING.sm },
});

export default HomeScreen;
