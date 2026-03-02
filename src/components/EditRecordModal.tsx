import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./ui/Icon";
import { RecordType } from "../app/state/RecordsContext";

import { fonts } from '../theme/fonts';
const typeLabels: RecordType[] = ["FOOD", "POOP", "SLEEP", "WEIGHT", "NOTE"];

interface EditRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    type: RecordType;
    title: string;
    time: string;
    value: string;
  }) => void;
  initialData?: {
    type: RecordType;
    title: string;
    time: string;
    value: string;
  };
  mode: "edit" | "confirm";
  petName?: string; 
}

export default function EditRecordModal({
  visible,
  onClose,
  onSave,
  initialData,
  mode,
}: EditRecordModalProps) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<RecordType>(initialData?.type || "FOOD");
  const [title, setTitle] = useState(initialData?.title || "");
  const [time, setTime] = useState(initialData?.time || "");
  const [value, setValue] = useState(initialData?.value || "");

  useEffect(() => {
    if (visible && initialData) {
      setType(initialData.type);
      setTitle(initialData.title);
      setTime(initialData.time);
      setValue(initialData.value);
    }
  }, [visible, initialData]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const trimmedTime = time.trim();
    const trimmedValue = value.trim();

    if (!trimmedTitle || !trimmedTime || !trimmedValue) {
      Alert.alert(tr('editRecord.missingData'), tr('editRecord.missingDataMsg'));
      return;
    }

    // Validar formato de hora (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(trimmedTime)) {
      Alert.alert(tr('editRecord.invalidTime'), tr('editRecord.invalidTimeMsg'));
      return;
    }

    onSave({
      type,
      title: trimmedTitle,
      time: trimmedTime,
      value: trimmedValue,
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
          <Text style={[styles.modalTitle, { color: t.text }]}>
            {mode === "edit" ? tr('editRecord.editTitle') : tr('editRecord.confirmTitle')}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Icon name="close" size={24} color={t.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContent}>
          <Text style={[styles.label, { color: t.textMuted }]}>{tr('editRecord.type')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {typeLabels.map((tp) => {
              const active = tp === type;
              return (
                <Pressable
                  key={tp}
                  onPress={() => setType(tp)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? t.accentSoft : t.card,
                      borderColor: active ? "transparent" : t.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: active ? t.accent : t.textMuted },
                    ]}
                  >
                    {tr('common.recordTypeSingular.' + tp)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, { color: t.textMuted }]}>{tr('editRecord.titleLabel')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={tr('editRecord.titlePlaceholder')}
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
              { color: t.text, borderColor: t.border, backgroundColor: t.bg },
            ]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>
            {tr('editRecord.timeLabel')}
          </Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
            placeholderTextColor={t.textMuted}
            keyboardType="numbers-and-punctuation"
            style={[
              styles.input,
              { color: t.text, borderColor: t.border, backgroundColor: t.bg },
            ]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>{tr('editRecord.valueLabel')}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={tr('editRecord.valuePlaceholder')}
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
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
            <Text style={{ color: t.textMuted, fontFamily: fonts.bold }}>
              {tr('common.cancel')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            style={[
              styles.btn,
              { backgroundColor: t.accent, borderColor: "transparent" },
            ]}
          >
            <Text style={{ color: "#fff", fontFamily: fonts.extraBold }}>{tr('common.save')}</Text>
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
    maxHeight: "80%",
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: fonts.extraBold },
  scrollContent: { maxHeight: 400 },
  label: {
    fontSize: 11,
    fontFamily: fonts.black,
    letterSpacing: 0.8,
    marginTop: 14,
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
