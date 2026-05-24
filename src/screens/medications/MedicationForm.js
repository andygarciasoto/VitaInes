import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, FlatList,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { t } from '../../localization';
import { BP_MEDICATIONS, FREQUENCY_OPTIONS } from '../../constants/medications';
import Button from '../../components/common/Button';

const MedicationForm = ({ onSave, onCancel, initialValues, inline = false }) => {
  const [search, setSearch] = useState('');
  const [selectedMed, setSelectedMed] = useState(initialValues?.name || '');
  const [selectedCategory, setSelectedCategory] = useState(initialValues?.category || '');
  const [dosage, setDosage] = useState(initialValues?.dosage || '');
  const [frequency, setFrequency] = useState(initialValues?.frequency || 1);
  const [doctorNotes, setDoctorNotes] = useState(initialValues?.doctorNotes || '');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredMeds = BP_MEDICATIONS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const selectMed = (med) => {
    setSelectedMed(med.name);
    setSelectedCategory(med.category);
    setSearch(med.name);
    setShowDropdown(false);
    if (med.commonDoses.length > 0) setDosage(med.commonDoses[0]);
  };

  const handleSave = () => {
    if (!selectedMed.trim() || !dosage.trim()) return;
    onSave({
      name: selectedMed.trim(),
      category: selectedCategory,
      dosage: dosage.trim(),
      frequency,
      doctorNotes: doctorNotes.trim(),
    });
  };

  const containerStyle = inline ? styles.inlineContainer : styles.container;

  return (
    <View style={containerStyle}>
      {/* Medication search */}
      <View style={styles.field}>
        <Text style={styles.label}>{t('medications.name')}</Text>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setSelectedMed(text);
            setShowDropdown(text.length > 0);
          }}
          placeholder={t('medications.search_placeholder')}
          placeholderTextColor={COLORS.textLight}
          onFocus={() => { if (search.length > 0) setShowDropdown(true); }}
        />
        {showDropdown && filteredMeds.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredMeds.slice(0, 8)}
              keyExtractor={(item) => item.id}
              style={styles.dropdownList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.dropdownItem} onPress={() => selectMed(item)}>
                  <Text style={styles.dropdownName}>{item.name}</Text>
                  <Text style={styles.dropdownCategory}>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Dosage */}
      {selectedMed ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>{t('medications.dosage')}</Text>
            <View style={styles.dosageRow}>
              {BP_MEDICATIONS.find((m) => m.name === selectedMed)?.commonDoses.map((dose) => (
                <TouchableOpacity
                  key={dose}
                  style={[styles.dosePill, dosage === dose && styles.dosePillActive]}
                  onPress={() => setDosage(dose)}
                >
                  <Text style={[styles.dosePillText, dosage === dose && styles.dosePillTextActive]}>
                    {dose}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 10mg"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          {/* Frequency */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('medications.frequency')}</Text>
            <View style={styles.freqRow}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.freqPill, frequency === opt.value && styles.freqPillActive]}
                  onPress={() => setFrequency(opt.value)}
                >
                  <Text style={[styles.freqText, frequency === opt.value && styles.freqTextActive]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Doctor notes */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('medications.doctor_notes')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={doctorNotes}
              onChangeText={setDoctorNotes}
              placeholder={t('medications.doctor_notes_placeholder')}
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.btnRow}>
            <Button title={t('common.cancel')} onPress={onCancel} variant="ghost" style={styles.cancelBtn} />
            <Button
              title={t('medications.save')}
              onPress={handleSave}
              disabled={!selectedMed || !dosage}
              style={styles.saveBtn}
            />
          </View>
        </>
      ) : (
        <View style={styles.btnRow}>
          <Button title={t('common.cancel')} onPress={onCancel} variant="ghost" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg },
  inlineContainer: {},
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.md, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  input: {
    borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONTS.md, color: COLORS.textPrimary,
    backgroundColor: COLORS.white, minHeight: 52,
  },
  notesInput: { minHeight: 80 },

  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  dropdownList: { maxHeight: 200 },
  dropdownItem: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  dropdownName: { fontSize: FONTS.md, fontWeight: FONTS.medium, color: COLORS.textPrimary },
  dropdownCategory: { fontSize: FONTS.sm, color: COLORS.textSecondary },

  dosageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
  dosePill: {
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
  },
  dosePillActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  dosePillText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  dosePillTextActive: { color: COLORS.primary, fontWeight: FONTS.semiBold },

  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  freqPill: {
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  freqPillActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  freqText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  freqTextActive: { color: COLORS.primary, fontWeight: FONTS.semiBold },

  btnRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});

export default MedicationForm;
