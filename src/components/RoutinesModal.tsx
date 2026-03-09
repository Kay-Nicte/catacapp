import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useToast } from "./ui/Toast";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/useTheme";
import { useRecords, RecordType, Routine } from "../app/state/RecordsContext";
import { Icon } from "./ui/Icon";
import { AnimatedPressable } from "./ui/AnimatedPressable";
import { shadows } from "../theme/tokens";
import { formatTime } from "../utils/format";

import { fonts } from '../theme/fonts';
interface RoutinesModalProps {
  visible: boolean;
  onClose: () => void;
  petId: string;
}

const typeLabels: RecordType[] = ["FOOD", "POOP", "SLEEP", "WEIGHT", "WALK", "NOTE"];

export default function RoutinesModal({ visible, onClose, petId }: RoutinesModalProps) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { routines, addRoutine, deleteRoutine, updateRoutine } = useRecords();
  const { showToast } = useToast();

  const petRoutines = routines.filter(r => r.petId === petId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<RecordType>("FOOD");
  const [formTitle, setFormTitle] = useState("");
  const [formTimeValue, setFormTimeValue] = useState<Date>(new Date());
  const [formValue, setFormValue] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  const resetForm = () => {
    setFormType("FOOD");
    setFormTitle("");
    setFormTimeValue(new Date());
    setFormValue("");
    setShowTimePicker(false);
    setShowAddForm(false);
    setEditingId(null);
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setFormTimeValue(selectedTime);
    }
  };

  const handleSave = () => {
    const title = formTitle.trim();
    const time = formatTime(formTimeValue);
    const value = formValue.trim();

    if (!title) {
      showToast(tr('editRecord.missingData'), tr('editRecord.missingDataMsg'), 'error');
      return;
    }

    if (editingId) {
      // Editar rutina existente
      updateRoutine(editingId, {
        type: formType,
        title,
        time,
        defaultValue: value || undefined,
      });
    } else {
      // Crear nueva rutina
      addRoutine({
        petId,
        type: formType,
        title,
        time,
        defaultValue: value || undefined,
        active: true,
      });
    }

    resetForm();
  };

  const handleEdit = (routine: Routine) => {
    setEditingId(routine.id);
    setFormType(routine.type);
    setFormTitle(routine.title);
    // Parse time string (HH:mm) to Date
    const [hours, minutes] = routine.time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours, minutes, 0, 0);
    setFormTimeValue(timeDate);
    setFormValue(routine.defaultValue || "");
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      tr('routines.deleteRoutine'),
      tr('routines.deleteConfirm'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('common.delete'),
          style: "destructive",
          onPress: () => deleteRoutine(id),
        },
      ]
    );
  };

  const handleToggleActive = (routine: Routine) => {
    updateRoutine(routine.id, { active: !routine.active });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: t.text }]}>{tr('routines.title')}</Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              {tr('routines.count', { count: petRoutines.length })}
            </Text>
          </View>
          <AnimatedPressable onPress={onClose} hitSlop={10}>
            <Icon name="close" size={28} color={t.text} />
          </AnimatedPressable>
        </View>

        {/* Lista de rutinas */}
        {!showAddForm && (
          <FlatList
            data={petRoutines.sort((a, b) => a.time.localeCompare(b.time))}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="time-outline" size={48} color={t.textMuted} />
                <Text style={[styles.emptyText, { color: t.textMuted }]}>
                  {tr('routines.emptyTitle')}
                </Text>
                <Text style={[styles.emptyHint, { color: t.textMuted }]}>
                  {tr('routines.emptyHint')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.routineCard,
                  { backgroundColor: t.card, borderColor: t.border, opacity: item.active ? 1 : 0.5 },
                  shadows.sm,
                ]}
              >
                <View style={styles.routineMain}>
                  <View style={styles.routineInfo}>
                    <Text style={[styles.routineTitle, { color: t.text }]}>
                      {tr('common.recordTypeSingular.' + item.type)} · {item.title}
                    </Text>
                    <Text style={[styles.routineMeta, { color: t.textMuted }]}>
                      {item.time}
                      {item.defaultValue && ` · ${item.defaultValue}`}
                    </Text>
                    {!item.active && (
                      <Text style={[styles.inactiveLabel, { color: t.textMuted }]}>
                        {tr('routines.disabled')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.routineActions}>
                    <AnimatedPressable
                      onPress={() => handleToggleActive(item)}
                      style={[
                        styles.actionBtn,
                        { backgroundColor: item.active ? t.accentSoft : t.bg },
                      ]}
                      hitSlop={8}
                      scale={0.92}
                    >
                      <Icon
                        name={item.active ? "checkmark-circle" : "pause-circle-outline"}
                        size={20}
                        color={item.active ? t.accent : t.textMuted}
                      />
                    </AnimatedPressable>

                    <AnimatedPressable
                      onPress={() => handleEdit(item)}
                      style={[styles.actionBtn, { backgroundColor: t.bg }]}
                      hitSlop={8}
                      scale={0.92}
                    >
                      <Icon name="pencil" size={18} color={t.textMuted} />
                    </AnimatedPressable>

                    <AnimatedPressable
                      onPress={() => handleDelete(item.id)}
                      style={[styles.actionBtn, { backgroundColor: t.bg }]}
                      hitSlop={8}
                      scale={0.92}
                    >
                      <Icon name="trash-outline" size={18} color={t.textMuted} />
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        {/* Formulario */}
        {showAddForm && (
          <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={[styles.label, { color: t.textMuted }]}>{tr('routines.type')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeRow}
            >
              {typeLabels.map(tp => {
                const active = tp === formType;
                return (
                  <AnimatedPressable
                    key={tp}
                    onPress={() => setFormType(tp)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? t.accentSoft : t.card,
                        borderColor: active ? "transparent" : t.border,
                      },
                    ]}
                    scale={0.95}
                  >
                    <Text style={[styles.typeText, { color: active ? t.accent : t.textMuted }]}>
                      {tr('common.recordTypeSingular.' + tp)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.label, { color: t.textMuted }]}>{tr('routines.titleLabel')}</Text>
            <TextInput
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder={tr('routines.titlePlaceholder')}
              placeholderTextColor={t.textMuted}
              style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.card }]}
            />

            <Text style={[styles.label, { color: t.textMuted }]}>{tr('routines.timeLabel')}</Text>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[styles.input, styles.timeInput, { borderColor: t.border, backgroundColor: t.card }]}
            >
              <Icon name="time-outline" size={20} color={t.textMuted} />
              <Text style={[styles.timeText, { color: t.text }]}>
                {formatTime(formTimeValue)}
              </Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={formTimeValue}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange}
                is24Hour={true}
              />
            )}

            <Text style={[styles.label, { color: t.textMuted }]}>{tr('routines.defaultValue')}</Text>
            <TextInput
              value={formValue}
              onChangeText={setFormValue}
              placeholder={tr('routines.defaultValuePlaceholder')}
              placeholderTextColor={t.textMuted}
              style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.card }]}
            />

            <Text style={[styles.hint, { color: t.textMuted }]}>
              {"💡 "}{tr('routines.hint')}
            </Text>
          </ScrollView>
        )}

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 14 }]}>
          {!showAddForm ? (
            <AnimatedPressable
              onPress={() => setShowAddForm(true)}
              style={[styles.addBtn, { backgroundColor: t.accent }, shadows.md]}
              scale={0.96}
            >
              <Icon name="add" size={24} color="#fff" />
              <Text style={styles.addBtnText}>{tr('routines.newRoutine')}</Text>
            </AnimatedPressable>
          ) : (
            <View style={styles.formActions}>
              <AnimatedPressable
                onPress={resetForm}
                style={[styles.cancelBtn, { backgroundColor: t.card, borderColor: t.border }]}
                scale={0.96}
              >
                <Text style={{ color: t.textMuted, fontFamily: fonts.bold }}>{tr('common.cancel')}</Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: t.accent }, shadows.md]}
                scale={0.96}
              >
                <Text style={{ color: "#fff", fontFamily: fonts.extraBold }}>
                  {editingId ? tr('common.save') : tr('routines.createRoutine')}
                </Text>
              </AnimatedPressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 24, fontFamily: fonts.extraBold },
  subtitle: { fontSize: 13, fontFamily: fonts.semiBold, marginTop: 2 },

  listContent: { paddingHorizontal: 20, paddingTop: 8 },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: { fontSize: 16, fontFamily: fonts.semiBold },
  emptyHint: { fontSize: 13, fontFamily: fonts.medium, textAlign: "center", paddingHorizontal: 40 },

  routineCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  routineMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routineInfo: { flex: 1, paddingRight: 12, gap: 4 },
  routineTitle: { fontSize: 15, fontFamily: fonts.extraBold },
  routineMeta: { fontSize: 13, fontFamily: fonts.semiBold },
  inactiveLabel: { fontSize: 11, fontFamily: fonts.bold, marginTop: 2 },
  routineActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  formContainer: { flex: 1, paddingHorizontal: 20 },
  label: {
    fontSize: 11,
    fontFamily: fonts.black,
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  typeRow: { gap: 8, paddingBottom: 4 },
  typeChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: { fontSize: 13, fontFamily: fonts.bold },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  timeInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    marginTop: 12,
    lineHeight: 18,
  },

  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  addBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontFamily: fonts.extraBold },
  formActions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});