import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export function PageSection({ title, subtitle = null, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function StatsGrid({ items = [] }) {
  const safeItems = useMemo(() => items.filter(Boolean), [items]);

  return (
    <View style={styles.statsGrid}>
      {safeItems.map((item) => (
        <View key={item.label} style={styles.statCard}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

export function InfoRows({ rows = [] }) {
  return (
    <View style={styles.infoGroup}>
      {rows.filter(Boolean).map((row) => (
        <View key={row.label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{row.label}</Text>
          <Text style={styles.infoValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function DropdownField({
  label,
  placeholder = 'Select option',
  options = [],
  value = null,
  onChange,
}) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((item) => item.value === value) || null;

  return (
    <View style={styles.dropdownWrap}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setVisible(true)}>
        <Text style={[styles.dropdownValue, !selected && styles.dropdownPlaceholder]}>
          {selected?.label || placeholder}
        </Text>
        <Text style={styles.dropdownCaret}>v</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="fade" transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => {
                      onChange?.(option.value);
                      setVisible(false);
                    }}
                  >
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.label}</Text>
                    {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { color: '#94a3b8', fontSize: 12, marginBottom: 10, lineHeight: 18 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statValue: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  infoGroup: { gap: 8 },
  infoRow: { borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 8 },
  infoLabel: { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
  infoValue: { color: '#e5e7eb', fontSize: 13, marginTop: 3 },
  dropdownWrap: { marginBottom: 14 },
  dropdownLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 4 },
  dropdownButton: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: { color: '#f1f5f9', fontSize: 14 },
  dropdownPlaceholder: { color: '#64748b' },
  dropdownCaret: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    maxHeight: '70%',
  },
  modalTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  optionRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  optionRowActive: { backgroundColor: '#172554', borderRadius: 10, paddingHorizontal: 10 },
  optionLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  optionLabelActive: { color: '#dbeafe' },
  optionDescription: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
});
