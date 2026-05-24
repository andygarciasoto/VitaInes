import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Card from '../../components/common/Card';
import Header from '../../components/common/Header';
import { generateRecommendations, getCategoryIcon } from '../../services/ai/recommendations';

const CATEGORY_COLORS = {
  food: { bg: '#FFF8E7', border: '#F5A623', icon: '#F5A623' },
  exercise: { bg: '#E8F5EF', border: '#4CAF93', icon: '#4CAF93' },
  hydration: { bg: '#E8F2FA', border: '#5BA4CF', icon: '#5BA4CF' },
  sleep: { bg: '#F0EBF8', border: '#9B59B6', icon: '#9B59B6' },
  stress: { bg: '#FDF0F4', border: '#F4A7B9', icon: '#F4A7B9' },
  general: { bg: '#E8F5EF', border: '#4CAF93', icon: '#4CAF93' },
  warning: { bg: '#FDECEA', border: '#E74C3C', icon: '#E74C3C' },
  disclaimer: { bg: '#F5F5F5', border: '#B0B0B0', icon: '#B0B0B0' },
};

const InsightsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { recommendations, recentReadings, language, recommendationsLoading } = state;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    dispatch({ type: 'SET_RECOMMENDATIONS_LOADING', payload: true });
    try {
      const recs = await generateRecommendations(recentReadings, language);
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: recs });
    } finally {
      setRefreshing(false);
    }
  };

  const RecommendationCard = ({ rec, index }) => {
    const colors = CATEGORY_COLORS[rec.category] || CATEGORY_COLORS.general;
    const isPriority = rec.priority === 'critical' || rec.priority === 'high';

    return (
      <Card
        style={[styles.recCard, { borderLeftColor: colors.border, backgroundColor: colors.bg }, isPriority && styles.recCardPriority]}
        variant="flat"
      >
        <View style={styles.recHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.border + '22' }]}>
            <Text style={styles.recIcon}>{getCategoryIcon(rec.category)}</Text>
          </View>
          <View style={styles.recMeta}>
            <Text style={[styles.recCategory, { color: colors.icon }]}>
              {t(`ai.categories.${rec.category}`) || rec.category}
            </Text>
            {isPriority && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>!</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.recText}>{rec.text}</Text>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={t('ai.title')} showBack onBack={() => navigation.goBack()} showLanguage={false} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={[COLORS.primaryLight, COLORS.blueLight]} style={styles.hero}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>{t('ai.powered_by')}</Text>
          <Text style={styles.heroSubtitle}>{t('ai.disclaimer')}</Text>
        </LinearGradient>

        {recommendationsLoading || refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>{t('ai.loading')}</Text>
          </View>
        ) : recommendations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💚</Text>
            <Text style={styles.emptyText}>{t('ai.no_data')}</Text>
          </Card>
        ) : (
          <>
            {recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} rec={rec} index={idx} />
            ))}
          </>
        )}

        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} activeOpacity={0.8}>
          <Text style={styles.refreshIcon}>🔄</Text>
          <Text style={styles.refreshText}>{t('ai.refresh')}</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },

  hero: {
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', marginBottom: SPACING.lg,
  },
  heroEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  heroTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  heroSubtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  loadingText: { fontSize: FONTS.md, color: COLORS.textSecondary, marginTop: SPACING.md },

  emptyCard: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONTS.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },

  recCard: { marginBottom: SPACING.md, borderLeftWidth: 4 },
  recCardPriority: { ...SHADOWS.md },
  recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  recIcon: { fontSize: 22 },
  recMeta: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  recCategory: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, flex: 1 },
  urgentBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.high, alignItems: 'center', justifyContent: 'center',
  },
  urgentText: { color: COLORS.white, fontSize: FONTS.sm, fontWeight: FONTS.bold },
  recText: { fontSize: FONTS.md, color: COLORS.textPrimary, lineHeight: 26 },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginTop: SPACING.sm,
  },
  refreshIcon: { fontSize: 18, marginRight: SPACING.sm },
  refreshText: { fontSize: FONTS.md, color: COLORS.primary, fontWeight: FONTS.medium },
});

export default InsightsScreen;
