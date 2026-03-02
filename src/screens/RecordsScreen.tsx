import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from 'react-i18next';
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { shadows } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePet } from "../app/state/PetContext";
import { useRecords, RecordType, Record as PetRecord } from "../app/state/RecordsContext";
import { useAds } from "../app/state/AdsContext";
import EditRecordModal from "../components/EditRecordModal";
import ScreenContainer from "../components/layout/ScreenContainer";
import { formatDateFull } from "../utils/format";

const typeLabels: RecordType[] = ["FOOD", "POOP", "SLEEP", "WEIGHT", "NOTE"];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function RecordsScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const { selectedPet, selectedPetId } = usePet();
  const { getRecordsByDate, addRecord, deleteRecord, updateRecord, isLoading } = useRecords();
  const { incrementActionCount } = useAds();

  const isMemorialSelected = selectedPet?.status === "memorial";

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PetRecord | null>(null);
  const [filterType, setFilterType] = useState<RecordType | "ALL">("ALL");

  // Form state
  const [newType, setNewType] = useState<RecordType>("FOOD");
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");

  const todayRecords = useMemo(
    () => getRecordsByDate(selectedDate, selectedPetId),
    [selectedDate, selectedPetId, getRecordsByDate]
  );

  const filteredRecords = useMemo(() => {
    const filtered = filterType === "ALL" ? todayRecords : todayRecords.filter((r: PetRecord) => r.type === filterType);
    return [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [todayRecords, filterType]);

  const isToday = isSameDay(selectedDate, new Date());

  function navigateDate(direction: "prev" | "next") {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  function handleAddRecord() {
    if (isMemorialSelected) return;

    const title = newTitle.trim();
    const value = newValue.trim();

    if (!title || !value) {
      Alert.alert(tr('records.missingData'), tr('records.missingDataMsg'));
      return;
    }

    addRecord({
      petId: selectedPetId,
      type: newType,
      title,
      value,
      source: "MANUAL",
    });

    // Incrementar contador para intersticiales
    incrementActionCount();

    setNewTitle("");
    setNewValue("");
    setNewType("FOOD");
    setModalOpen(false);
  }

  function handleDeleteRecord(id: string) {
    if (isMemorialSelected) return;

    Alert.alert(
      tr('records.deleteTitle'),
      tr('records.deleteMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('common.delete'),
          style: "destructive",
          onPress: () => deleteRecord(id),
        },
      ]
    );
  }

  function handleEditRecord(record: PetRecord) {
    if (isMemorialSelected) return;
    setEditingRecord(record);
    setEditModalOpen(true);
  }

  function handleSaveEditedRecord(data: {
    type: RecordType;
    title: string;
    time: string;
    value: string;
  }) {
    if (!editingRecord) return;

    updateRecord(editingRecord.id, {
      type: data.type,
      title: data.title,
      value: data.value,
      customTime: data.time,
    });

    setEditingRecord(null);
    setEditModalOpen(false);
  }

  const recordsByType = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: todayRecords.length,
      FOOD: 0,
      POOP: 0,
      SLEEP: 0,
      WEIGHT: 0,
      NOTE: 0,
    };

    todayRecords.forEach((r: PetRecord) => {
      counts[r.type]++;
    });

    return counts;
  }, [todayRecords]);

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: t.bg, paddingTop: insets.top + 6 },
      ]}
    >
      <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: t.text }]}>{tr('records.title')}</Text>
            {selectedPet?.name && (
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {selectedPet.name}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <AnimatedPressable
          onPress={() => navigateDate("prev")}
          style={[styles.navBtn, { backgroundColor: t.card, borderColor: t.border }]}
          hitSlop={8}
        >
          <Icon name="chevron-back" size={20} color={t.text} />
        </AnimatedPressable>

        <AnimatedPressable
          onPress={goToToday}
          style={[styles.dateChip, { backgroundColor: t.card, borderColor: t.border }]}
        >
          <Icon name="calendar" size={16} color={t.textMuted} />
          <Text style={[styles.dateText, { color: t.text }]}>
            {isToday ? tr('records.today') : formatDateFull(selectedDate)}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => navigateDate("next")}
          style={[styles.navBtn, { backgroundColor: t.card, borderColor: t.border }]}
          hitSlop={8}
          disabled={isToday}
        >
          <Icon
            name="chevron-forward"
            size={20}
            color={isToday ? t.border : t.text}
          />
        </AnimatedPressable>
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <Pressable
          onPress={() => setFilterType("ALL")}
          style={[
            styles.filterChip,
            {
              backgroundColor: filterType === "ALL" ? t.accentSoft : t.card,
              borderColor: filterType === "ALL" ? "transparent" : t.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filterType === "ALL" ? t.accent : t.textMuted },
            ]}
          >
            {tr('records.all')} ({recordsByType.ALL})
          </Text>
        </Pressable>

        {typeLabels.map(type => (
          <Pressable
            key={type}
            onPress={() => setFilterType(type)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterType === type ? t.accentSoft : t.card,
                borderColor: filterType === type ? "transparent" : t.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filterType === type ? t.accent : t.textMuted },
              ]}
            >
              {tr('common.recordTypeSingular.' + type)} ({recordsByType[type]})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Records List */}
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredRecords}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const itemDate = new Date(item.timestamp);
            const displayTime = item.customTime || `${String(itemDate.getHours()).padStart(2, "0")}:${String(
              itemDate.getMinutes()
            ).padStart(2, "0")}`;

            return (
              <AnimatedPressable
                onPress={() => handleEditRecord(item)}
                onLongPress={() => handleDeleteRecord(item.id)}
                disabled={isMemorialSelected}
                style={[
                  styles.recordRow,
                  shadows.sm,
                  {
                    backgroundColor: t.card,
                    opacity: isMemorialSelected ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.recordLeft}>
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordTitle, { color: t.text }]}>
                      {tr('common.recordTypeSingular.' + item.type)} · {item.title}
                    </Text>
                    {item.source === "ROUTINE" && (
                      <View style={[styles.sourceBadge, { backgroundColor: t.accentSoft }]}>
                        <Text style={[styles.sourceBadgeText, { color: t.accent }]}>
                          {tr('records.routine')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.recordMeta, { color: t.textMuted }]}>
                    {displayTime} · {item.value}
                  </Text>
                </View>

                <Icon name="chevron-forward" size={18} color={t.textMuted} />
              </AnimatedPressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="document-text-outline" size={48} color={t.textMuted} />
              <Text style={[styles.emptyText, { color: t.textMuted }]}>
                {tr('records.emptyDay')}
              </Text>
              {!isMemorialSelected && (
                <Text style={[styles.emptyHint, { color: t.textMuted }]}>
                  {tr('records.emptyHint')}
                </Text>
              )}
            </View>
          }
        />
      </View>

      {isMemorialSelected && (
        <Text style={[styles.memorialHint, { color: t.textMuted }]}>
          {tr('home.memorialHint')}
        </Text>
      )}

      </ScreenContainer>

      {/* Floating Add Button */}
      {!isMemorialSelected && (
        <AnimatedPressable
          onPress={() => setModalOpen(true)}
          style={[styles.fab, { backgroundColor: t.accent }, shadows.lg]}
        >
          <Icon name="add" size={26} color="#fff" />
        </AnimatedPressable>
      )}

      {/* Add Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)} />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom + 14 },
          ]}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: t.text }]}>{tr('records.addRecord')}</Text>
              {selectedPet?.name && (
                <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>
                  {tr('records.forPet', { name: selectedPet.name })}
                </Text>
              )}
            </View>
            <AnimatedPressable onPress={() => setModalOpen(false)} hitSlop={10}>
              <Icon name="close" size={24} color={t.textMuted} />
            </AnimatedPressable>
          </View>

          <Text style={[styles.label, { color: t.textMuted }]}>{tr('records.typeLabel')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {typeLabels.map(tp => {
              const active = tp === newType;
              return (
                <Pressable
                  key={tp}
                  onPress={() => setNewType(tp)}
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
                      styles.typeChipText,
                      { color: active ? t.accent : t.textMuted },
                    ]}
                  >
                    {tr('common.recordTypeSingular.' + tp)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, { color: t.textMuted }]}>{tr('records.titleLabel')}</Text>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder={tr('records.titlePlaceholder')}
            placeholderTextColor={t.textMuted}
            style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>{tr('records.valueLabel')}</Text>
          <TextInput
            value={newValue}
            onChangeText={setNewValue}
            placeholder={tr('records.valuePlaceholder')}
            placeholderTextColor={t.textMuted}
            style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
          />

          <View style={styles.modalActions}>
            <Pressable
              onPress={() => setModalOpen(false)}
              style={[styles.btn, { backgroundColor: t.bg, borderColor: t.border }]}
            >
              <Text style={{ color: t.textMuted, fontWeight: "700" }}>{tr('common.cancel')}</Text>
            </Pressable>

            <Pressable
              onPress={handleAddRecord}
              style={[styles.btn, { backgroundColor: t.accent, borderColor: "transparent" }]}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>{tr('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <EditRecordModal
        visible={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveEditedRecord}
        initialData={
          editingRecord
            ? {
                type: editingRecord.type,
                title: editingRecord.title,
                time: (() => {
                  if (editingRecord.customTime) return editingRecord.customTime;
                  const d = new Date(editingRecord.timestamp);
                  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                })(),
                value: editingRecord.value,
              }
            : undefined
        }
        mode="edit"
        petName={selectedPet?.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginVertical: 14,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    maxWidth: 280,
    justifyContent: "center",
  },
  dateText: { fontSize: 14, fontWeight: "700" },

  filterScroll: {
    gap: 8,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: { fontSize: 13, fontWeight: "700" },

  listContent: {
    paddingTop: 12,
    paddingBottom: 80,
  },
  recordRow: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordLeft: { flex: 1, gap: 4, paddingRight: 12 },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  recordTitle: { fontSize: 15, fontWeight: "800" },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  recordMeta: { fontSize: 13, fontWeight: "600" },
  separator: { height: 10 },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptyHint: { fontSize: 13, fontWeight: "500" },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

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
  modalTitle: { fontSize: 22, fontWeight: "900" },
  modalSubtitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  label: {
    fontSize: 11,
    fontWeight: "900",
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
  typeChipText: { fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: "600",
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

  memorialHint: {
    marginVertical: 10,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});