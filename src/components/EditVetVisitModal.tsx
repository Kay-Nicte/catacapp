import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Icon } from "./ui/Icon";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";

interface EditVetVisitModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    type: 'PAST' | 'UPCOMING';
    date: string;
    time: string;
    veterinarian: string;
    reason: string;
    notes: string;
  }) => void;
  initialData?: {
    type: 'PAST' | 'UPCOMING';
    date: string;
    time: string;
    veterinarian: string;
    reason: string;
    notes: string;
  };
  petName?: string;
}

export default function EditVetVisitModal({
  visible,
  onClose,
  onSave,
  initialData,
  petName,
}: EditVetVisitModalProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [dateValue, setDateValue] = useState<Date>(new Date());
  const [timeValue, setTimeValue] = useState<Date>(new Date());
  const [veterinarian, setVeterinarian] = useState(initialData?.veterinarian || '');
  const [reason, setReason] = useState(initialData?.reason || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible && initialData) {
      // Parse date string (YYYY-MM-DD)
      const [year, month, day] = initialData.date.split('-').map(Number);
      setDateValue(new Date(year, month - 1, day));

      // Parse time string (HH:mm)
      const [hours, minutes] = initialData.time.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      setTimeValue(timeDate);

      setVeterinarian(initialData.veterinarian);
      setReason(initialData.reason);
      setNotes(initialData.notes);
    } else if (visible && !initialData) {
      const now = new Date();
      setDateValue(now);
      setTimeValue(now);
      setVeterinarian('');
      setReason('');
      setNotes('');
    }
  }, [visible, initialData]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateValue(selectedDate);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setTimeValue(selectedTime);
    }
  };

  const formatDateDisplay = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatTimeDisplay = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleSave = () => {
    const trimmedVet = veterinarian.trim();
    const trimmedReason = reason.trim();
    const trimmedNotes = notes.trim();

    if (!trimmedVet || !trimmedReason) {
      return;
    }

    // Format date as YYYY-MM-DD
    const dateStr = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;

    // Format time as HH:mm
    const timeStr = `${String(timeValue.getHours()).padStart(2, '0')}:${String(timeValue.getMinutes()).padStart(2, '0')}`;

    // Calcular automáticamente si es PAST o UPCOMING basándose en fecha/hora
    const visitDateTime = new Date(
      dateValue.getFullYear(),
      dateValue.getMonth(),
      dateValue.getDate(),
      timeValue.getHours(),
      timeValue.getMinutes()
    );
    const now = new Date();
    const type: 'PAST' | 'UPCOMING' = visitDateTime >= now ? 'UPCOMING' : 'PAST';

    onSave({
      type,
      date: dateStr,
      time: timeStr,
      veterinarian: trimmedVet,
      reason: trimmedReason,
      notes: trimmedNotes,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.modalCard,
          {
            backgroundColor: t.card,
            borderColor: t.border,
            paddingBottom: insets.bottom + 14,
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <View>
            <Text style={[styles.modalTitle, { color: t.text }]}>
              {initialData ? 'Editar visita' : 'Nueva visita'}
            </Text>
            {petName && (
              <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>
                para {petName}
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Icon name="close" size={24} color={t.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContent}>
          <Text style={[styles.label, { color: t.textMuted }]}>FECHA</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.input, styles.dateInput, { borderColor: t.border, backgroundColor: t.bg }]}
          >
            <Icon name="calendar-outline" size={20} color={t.textMuted} />
            <Text style={[styles.dateText, { color: t.text }]}>
              {formatDateDisplay(dateValue)}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
            />
          )}

          <Text style={[styles.label, { color: t.textMuted }]}>HORA</Text>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={[styles.input, styles.dateInput, { borderColor: t.border, backgroundColor: t.bg }]}
          >
            <Icon name="time-outline" size={20} color={t.textMuted} />
            <Text style={[styles.dateText, { color: t.text }]}>
              {formatTimeDisplay(timeValue)}
            </Text>
          </Pressable>
          {showTimePicker && (
            <DateTimePicker
              value={timeValue}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onTimeChange}
              is24Hour={true}
            />
          )}

          <Text style={[styles.label, { color: t.textMuted }]}>VETERINARIO/A</Text>
          <TextInput
            value={veterinarian}
            onChangeText={setVeterinarian}
            placeholder="Dr. García"
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
              { color: t.text, borderColor: t.border, backgroundColor: t.bg },
            ]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>MOTIVO</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Vacunación, revisión general..."
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
              { color: t.text, borderColor: t.border, backgroundColor: t.bg },
            ]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>NOTAS</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Diagnóstico, recordatorios, cosas a llevar..."
            placeholderTextColor={t.textMuted}
            multiline
            numberOfLines={4}
            style={[
              styles.textArea,
              { color: t.text, borderColor: t.border, backgroundColor: t.bg },
            ]}
          />
        </ScrollView>

        <View style={styles.modalActions}>
          <Pressable
            onPress={onClose}
            style={[
              styles.btn,
              { backgroundColor: t.bg, borderColor: t.border },
            ]}
          >
            <Text style={{ color: t.textMuted, fontWeight: "700" }}>
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            style={[
              styles.btn,
              { backgroundColor: t.accent, borderColor: "transparent" },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Guardar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  scrollContent: { maxHeight: 500 },
  label: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: "600",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
