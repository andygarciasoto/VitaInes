import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import { useApp } from '../../store/AppContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import MedicationForm from './MedicationForm';
import {
  getMedications,
  addMedication,
  updateMedication,
  toggleMedication,
  deleteMedication,
} from '../../services/firebase/medications';

const FREQ_LABELS = {
  0: 'as_needed',
  1: 'once_daily',
  2: 'twice_daily',
  3: 'three_times_daily',
  4: 'four_times_daily',
};

const MedicationsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { user, medications } = state;

  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMedications();
  }, [user?.uid]);

  const loadMedications = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const meds = await getMedications(user.uid);
      dispatch({ type: 'SET_MEDICATIONS', payload: meds });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (medData) => {
    if (!user?.uid) return;
    try {
      const id = await addMedication(user.uid, medData);
      dispatch({ type: 'ADD_MEDICATION', payload: { id, ...medData, active: true } });
      setShowForm(false);
    } catch {
      Alert.alert('Error', t('common.error'));
    }
  };

  const handleEdit = async (medData) => {
    if (!editingMed) return;
    try {
      await updateMedication(editingMed.id, medData);
      dispatch({ type: 'UPDATE_MEDICATION', payload: { id: editingMed.id, ...medData } });
      setEditingMed(null);
    } catch {
      Alert.alert('Error', t('common.error'));
    }
  };

  const handleToggle = async (med) => {
    try {
      await toggleMedication(med.id, !med.active);
      dispatch({ type: 'UPDATE_MEDICATION', payload: { id: med.id, active: !med.active } });
    } catch {
      Alert.alert('Error', t('common.error'));
    }
  };

  const handleDelete = (med) => {
    Alert.alert(
      t('medications.delete'),
      t('medications.delete_confirm'),
      [
        { text: t('medications.delete_no'), style: 'cancel' },
        {
          text: t('medications.delete_yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedication(med.id);
              dispatch({ type: 'DELETE_MEDICATION', payload: med.id });
            } catch {
              Alert.alert('Error', t('common.error'));
            }
          },
        },
      ]
    );
  };

  const activeMeds = medications.filter((m) => m.active);
  const pausedMeds = medications.filter((m) => !m.active);

  const MedCard = ({ med }) => (
    <Card style={[styles.medCard, !med.active && styles.medCardPaused]} variant="flat">
      <View style={styles.medHeader}>
        <View style={styles.medTitleRow}>
          <Text style={styles.medName}>{med.name}</Text>
          <View style={[styles.statusBadge, med.active ? styles.activeBadge : styles.pausedBadge]}>
            <Text style={[styles.statusText, med.active ? styles.activeText : styles.pausedText]}>
              {med.active ? t('medications.active_label') : t('medications.paused_label')}
            </Text>
          </View>
        </View>
        {med.category && <Text style={styles.medCategory}>{med.category}</Text>}
      </View>

      <View style={styles.medDetails}>
        <View style={styles.detailChip}>
          <Text style={styles.detailIcon}>💊</Text>
          <Text style={styles.detailText}>{med.dosage}</Text>
        </View>
        <View style={styles.detailChip}>
          <Text style={styles.detailIcon}>🔄</Text>
          <Text style={styles.detailText}>{t(`medications.${FREQ_LABELS[med.frequency] || 'once_daily'}`)}</Text>
        </View>
      </View>

      {med.doctorNotes ? (
        <View style={styles.notesRow}>
          <Text style={styles.notesIcon}>📋</Text>
          <Text style={styles.notesText} numberOfLines={2}>{med.doctorNotes}</Text>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingMed(med); }}>
          <Text style={styles.actionBtnText}>✏️ {t('medications.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggle(med)}>
          <Text style={styles.actionBtnText}>
            {med.active ? `⏸ ${t('medications.pause')}` : `▶️ ${t('medications.resume')}`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(med)}>
          <Text style={[styles.actionBtnText, styles.deleteText]}>🗑 {t('medications.delete')}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={t('medications.title')} showBack onBack={() => navigation.goBack()} showLanguage={false} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {medications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>{t('medications.no_medications')}</Text>
            <Text style={styles.emptySubtitle}>{t('medications.add_first')}</Text>
          </View>
        ) : (
          <>
            {activeMeds.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>✅ {t('medications.active_label')}</Text>
                {activeMeds.map((med) => <MedCard key={med.id} med={med} />)}
              </View>
            )}
            {pausedMeds.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏸ {t('medications.paused_label')}</Text>
                {pausedMeds.map((med) => <MedCard key={med.id} med={med} />)}
              </View>
            )}
          </>
        )}
        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + SPACING.lg }]}
        onPress={() => setShowForm(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={showForm || !!editingMed} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingMed ? t('medications.edit') : t('medications.add')}
            </Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            <MedicationForm
              onSave={editingMed ? handleEdit : handleAdd}
              onCancel={() => { setShowForm(false); setEditingMed(null); }}
              initialValues={editingMed}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },

  medCard: { marginBottom: SPACING.md },
  medCardPaused: { opacity: 0.7 },
  medHeader: { marginBottom: SPACING.sm },
  medTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  medName: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, flex: 1 },
  medCategory: { fontSize: FONTS.sm, color: COLORS.textSecondary },

  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  activeBadge: { backgroundColor: COLORS.normalBg },
  pausedBadge: { backgroundColor: COLORS.elevatedBg },
  statusText: { fontSize: FONTS.xs, fontWeight: FONTS.semiBold },
  activeText: { color: COLORS.normal },
  pausedText: { color: COLORS.elevated },

  medDetails: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  detailChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  detailIcon: { fontSize: 14, marginRight: 4 },
  detailText: { fontSize: FONTS.sm, color: COLORS.textPrimary },

  notesRow: { flexDirection: 'row', marginBottom: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  notesIcon: { fontSize: 14, marginRight: SPACING.xs },
  notesText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 20 },

  actionsRow: { flexDirection: 'row', gap: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: SPACING.sm },
  actionBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center' },
  actionBtnText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.medium },
  deleteBtn: {},
  deleteText: { color: COLORS.high },

  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: FONTS.md, color: COLORS.textSecondary },

  fab: {
    position: 'absolute', right: SPACING.lg,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.lg,
  },
  fabText: { fontSize: 32, color: COLORS.white, lineHeight: 36 },

  modal: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  modalScroll: { padding: SPACING.lg },
});

export default MedicationsScreen;
