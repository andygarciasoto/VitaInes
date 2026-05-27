import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, FlatList, Modal, SafeAreaView,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { t } from '../../localization';
import { BP_MEDICATIONS } from '../../constants/medications';
import Button from '../../components/common/Button';

const FREQ_OPTIONS = [
  { value: 1, label: '1×', sub: 'Daily' },
  { value: 2, label: '2×', sub: 'Daily' },
  { value: 3, label: '3×', sub: 'Daily' },
  { value: 4, label: '4×', sub: 'Daily' },
  { value: 0, label: 'PRN', sub: 'As needed' },
];

// ─── Medication Picker Modal ───────────────────────────────────────────────────
const MedPickerModal = ({ visible, onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim().length > 0
    ? BP_MEDICATIONS.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
      )
    : BP_MEDICATIONS;

  const handleSelect = (med) => {
    setSearch('');
    onSelect(med);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modal.container}>

        {/* Header */}
        <View style={modal.header}>
          <Text style={modal.title}>💊 {t('medications.name')}</Text>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn} activeOpacity={0.7}>
            <Text style={modal.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={modal.searchWrapper}>
          <Text style={modal.searchIcon}>🔍</Text>
          <TextInput
            style={modal.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('medications.search_placeholder')}
            placeholderTextColor={COLORS.textLight}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modal.item}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <View style={modal.itemBody}>
                <Text style={modal.itemName}>{item.name}</Text>
                <View style={modal.categoryTag}>
                  <Text style={modal.categoryText}>{item.category}</Text>
                </View>
              </View>
              <Text style={modal.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={modal.sep} />}
          ListEmptyComponent={
            <View style={modal.empty}>
              <Text style={modal.emptyText}>No medications found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

// ─── Main Form ─────────────────────────────────────────────────────────────────
const MedicationForm = ({ onSave, onCancel, initialValues }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMed, setSelectedMed] = useState(
    initialValues?.name
      ? { name: initialValues.name, category: initialValues.category || '', commonDoses: [] }
      : null
  );
  const [dosage, setDosage] = useState(initialValues?.dosage || '');
  const [frequency, setFrequency] = useState(initialValues?.frequency ?? 1);
  const [doctorNotes, setDoctorNotes] = useState(initialValues?.doctorNotes || '');

  const handleSelectMed = useCallback((med) => {
    setSelectedMed(med);
    if (med.commonDoses?.length > 0) setDosage(med.commonDoses[0]);
    setShowPicker(false);
  }, []);

  const handleSave = () => {
    if (!selectedMed || !dosage.trim()) return;
    onSave({
      name: selectedMed.name,
      category: selectedMed.category || '',
      dosage: dosage.trim(),
      frequency,
      doctorNotes: doctorNotes.trim(),
    });
  };

  const canSave = !!selectedMed && dosage.trim().length > 0;

  return (
    <View>
      {/* ── Step 1: Medication picker ── */}
      <Text style={form.label}>{t('medications.name')}</Text>
      <TouchableOpacity
        style={[form.pickerBtn, selectedMed && form.pickerBtnActive]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Text style={form.pickerEmoji}>💊</Text>
        <View style={form.pickerMiddle}>
          {selectedMed ? (
            <>
              <Text style={form.pickerName}>{selectedMed.name}</Text>
              {selectedMed.category ? (
                <Text style={form.pickerCategory}>{selectedMed.category}</Text>
              ) : null}
            </>
          ) : (
            <Text style={form.pickerPlaceholder}>{t('medications.search_placeholder')}</Text>
          )}
        </View>
        <Text style={form.pickerChevron}>›</Text>
      </TouchableOpacity>

      {/* ── Step 2: Dosage (visible after medication selected) ── */}
      {selectedMed && (
        <>
          <Text style={form.label}>{t('medications.dosage')}</Text>
          {selectedMed.commonDoses?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={form.chipRow}
              style={form.chipScroll}
            >
              {selectedMed.commonDoses.map((dose) => (
                <TouchableOpacity
                  key={dose}
                  style={[form.chip, dosage === dose && form.chipActive]}
                  onPress={() => setDosage(dose)}
                  activeOpacity={0.8}
                >
                  <Text style={[form.chipText, dosage === dose && form.chipTextActive]}>
                    {dose}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TextInput
            style={form.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="e.g. 10mg"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* ── Step 3: Frequency ── */}
          <Text style={form.label}>{t('medications.frequency')}</Text>
          <View style={form.freqRow}>
            {FREQ_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[form.freqBtn, frequency === opt.value && form.freqBtnActive]}
                onPress={() => setFrequency(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[form.freqLabel, frequency === opt.value && form.freqLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[form.freqSub, frequency === opt.value && form.freqSubActive]}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Step 4: Doctor Notes ── */}
          <Text style={form.label}>{t('medications.doctor_notes')}</Text>
          <TextInput
            style={[form.input, form.notesInput]}
            value={doctorNotes}
            onChangeText={setDoctorNotes}
            placeholder={t('medications.doctor_notes_placeholder')}
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </>
      )}

      {/* ── Action buttons ── */}
      <View style={form.btnRow}>
        <Button title={t('common.cancel')} onPress={onCancel} variant="ghost" style={form.cancelBtn} />
        <Button
          title={t('medications.save')}
          onPress={handleSave}
          disabled={!canSave}
          style={form.saveBtn}
        />
      </View>

      {/* ── Picker Modal ── */}
      <MedPickerModal
        visible={showPicker}
        onSelect={handleSelectMed}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
};

// ─── Form styles ───────────────────────────────────────────────────────────────
const form = StyleSheet.create({
  label: {
    fontSize: FONTS.md,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },

  // Picker button
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    backgroundColor: COLORS.background, minHeight: 72,
  },
  pickerBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  pickerEmoji: { fontSize: 28, marginRight: SPACING.md },
  pickerMiddle: { flex: 1 },
  pickerName: { fontSize: FONTS.lg, fontWeight: FONTS.semiBold, color: COLORS.primary },
  pickerCategory: { fontSize: FONTS.sm, color: COLORS.primaryDark, marginTop: 2 },
  pickerPlaceholder: { fontSize: FONTS.md, color: COLORS.textLight },
  pickerChevron: { fontSize: 28, color: COLORS.textLight },

  // Dosage chips
  chipScroll: { marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, paddingRight: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.white, minHeight: 48, justifyContent: 'center',
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  chipText: { fontSize: FONTS.md, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  chipTextActive: { color: COLORS.white, fontWeight: FONTS.bold },

  // Text input
  input: {
    borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONTS.md, color: COLORS.textPrimary,
    backgroundColor: COLORS.white, minHeight: 56,
  },
  notesInput: { minHeight: 100 },

  // Frequency
  freqRow: { flexDirection: 'row', gap: SPACING.sm },
  freqBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.background, minHeight: 64,
  },
  freqBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  freqLabel: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textSecondary },
  freqLabelActive: { color: COLORS.primary },
  freqSub: { fontSize: 10, color: COLORS.textLight, textAlign: 'center', marginTop: 2 },
  freqSubActive: { color: COLORS.primaryDark },

  // Buttons
  btnRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});

// ─── Modal styles ──────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: FONTS.md, color: COLORS.textSecondary },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    margin: SPACING.lg,
    borderWidth: 2, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    minHeight: 56,
  },
  searchIcon: { fontSize: 20, marginRight: SPACING.sm },
  searchInput: { flex: 1, fontSize: FONTS.md, color: COLORS.textPrimary },

  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    minHeight: 76,
  },
  itemBody: { flex: 1 },
  itemName: {
    fontSize: FONTS.lg, fontWeight: FONTS.medium,
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  categoryText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  chevron: { fontSize: 28, color: COLORS.textLight },

  sep: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: SPACING.lg },

  empty: { alignItems: 'center', padding: SPACING.xxl },
  emptyText: { fontSize: FONTS.md, color: COLORS.textSecondary },
});

export default MedicationForm;
