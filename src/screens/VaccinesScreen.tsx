import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTheme } from "../theme/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePet } from "../app/state/PetContext";
import { useAds } from "../app/state/AdsContext";
import { useVaccines, Vaccine } from "../app/state/VaccinesContext";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { shadows } from "../theme/tokens";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate();
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function isUpcoming(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 60; // Próximas en los siguientes 60 días
}

function isPastDue(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date < new Date();
}

export default function VaccinesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { selectedPet, selectedPetId } = usePet();
  const { incrementActionCount } = useAds();
  const { getVaccinesByPet, addVaccine, updateVaccine, deleteVaccine, isLoading } = useVaccines();

  const isMemorialSelected = selectedPet?.status === "memorial";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formNextDose, setFormNextDose] = useState<Date | null>(null);
  const [formNotes, setFormNotes] = useState("");

  // DatePicker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNextDosePicker, setShowNextDosePicker] = useState(false);

  const petVaccines = useMemo(
    () => getVaccinesByPet(selectedPetId),
    [getVaccinesByPet, selectedPetId]
  );

  const upcomingVaccines = useMemo(
    () => petVaccines.filter((v) => isUpcoming(v.nextDose) || isPastDue(v.nextDose)),
    [petVaccines]
  );

  const resetForm = () => {
    setFormName("");
    setFormDate(new Date());
    setFormNextDose(null);
    setFormNotes("");
    setEditingVaccine(null);
  };

  const handleOpenAdd = () => {
    if (isMemorialSelected) return;
    resetForm();
    setFormDate(new Date());
    setModalOpen(true);
  };

  const handleOpenEdit = (vaccine: Vaccine) => {
    if (isMemorialSelected) return;
    setEditingVaccine(vaccine);
    setFormName(vaccine.name);
    setFormDate(new Date(vaccine.date));
    setFormNextDose(vaccine.nextDose ? new Date(vaccine.nextDose) : null);
    setFormNotes(vaccine.notes || "");
    setModalOpen(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setFormDate(selectedDate);
    }
  };

  const onNextDoseChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowNextDosePicker(Platform.OS === "ios");
    if (selectedDate) {
      setFormNextDose(selectedDate);
    }
  };

  const formatDateDisplay = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const handleDelete = (id: string) => {
    if (isMemorialSelected) return;
    Alert.alert("Eliminar vacuna", "¿Estás seguro de que quieres eliminar este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteVaccine(id),
      },
    ]);
  };

  const handleSave = () => {
    const name = formName.trim();

    if (!name) {
      Alert.alert("Faltan datos", "Completa al menos el nombre de la vacuna.");
      return;
    }

    const vaccineFields = {
      petId: selectedPetId,
      name,
      date: formDate.toISOString(),
      nextDose: formNextDose ? formNextDose.toISOString() : undefined,
      notes: formNotes.trim() || undefined,
    };

    if (editingVaccine) {
      updateVaccine(editingVaccine.id, vaccineFields);
    } else {
      addVaccine(vaccineFields);
    }

    // Incrementar contador para intersticiales
    incrementActionCount();

    setModalOpen(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6 }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: t.text }]}>Vacunas</Text>
            {selectedPet?.name && (
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {selectedPet.name}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Alertas de próximas vacunas */}
      {upcomingVaccines.length > 0 && !isMemorialSelected && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
              PRÓXIMOS RECORDATORIOS
            </Text>
            <View style={[styles.badge, { backgroundColor: t.accent }]}>
              <Text style={styles.badgeText}>{upcomingVaccines.length}</Text>
            </View>
          </View>

          {upcomingVaccines.map((vaccine) => {
            const pastDue = isPastDue(vaccine.nextDose);
            return (
              <AnimatedPressable
                key={`upcoming-${vaccine.id}`}
                onPress={() => handleOpenEdit(vaccine)}
                style={[
                  styles.alertCard,
                  shadows.md,
                  {
                    backgroundColor: pastDue ? "rgba(214, 69, 69, 0.1)" : t.accentSoft,
                    borderColor: pastDue ? t.danger : t.accent,
                  },
                ]}
              >
                <Icon
                  name={pastDue ? "warning" : "notifications"}
                  size={20}
                  color={pastDue ? t.danger : t.accent}
                />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: t.text }]}>{vaccine.name}</Text>
                  <Text style={[styles.alertDate, { color: pastDue ? t.danger : t.textMuted }]}>
                    {pastDue ? "Vencida: " : "Próxima: "}
                    {formatDate(vaccine.nextDose!)}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </>
      )}

      {/* Lista de vacunas */}
      <View style={[styles.sectionHeader, { marginTop: upcomingVaccines.length > 0 ? 20 : 0 }]}>
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
          HISTORIAL DE VACUNACIÓN
        </Text>
      </View>

      <FlatList
        data={petVaccines.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <AnimatedPressable
            onPress={() => handleOpenEdit(item)}
            onLongPress={() => handleDelete(item.id)}
            disabled={isMemorialSelected}
            style={[
              styles.vaccineCard,
              shadows.md,
              {
                backgroundColor: t.card,
                borderColor: t.border,
                opacity: isMemorialSelected ? 0.6 : 1,
              },
            ]}
          >
            <View style={[styles.vaccineIcon, { backgroundColor: t.accentSoft }]}>
              <Icon name="shield-checkmark" size={22} color={t.accent} />
            </View>

            <View style={styles.vaccineInfo}>
              <Text style={[styles.vaccineName, { color: t.text }]}>{item.name}</Text>
              <Text style={[styles.vaccineDate, { color: t.textMuted }]}>
                Aplicada: {formatDate(item.date)}
              </Text>
              {item.nextDose && (
                <Text style={[styles.vaccineNext, { color: t.textMuted }]}>
                  Próxima dosis: {formatDate(item.nextDose)}
                </Text>
              )}
              {item.notes && (
                <Text style={[styles.vaccineNotes, { color: t.textMuted }]} numberOfLines={1}>
                  {item.notes}
                </Text>
              )}
            </View>

            <Icon name="chevron-forward" size={18} color={t.textMuted} />
          </AnimatedPressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="shield-checkmark" size={48} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              No hay vacunas registradas
            </Text>
            {!isMemorialSelected && (
              <Text style={[styles.emptyHint, { color: t.textMuted }]}>
                Usa el botón + para añadir una
              </Text>
            )}
          </View>
        }
      />

      {isMemorialSelected && (
        <Text style={[styles.memorialHint, { color: t.textMuted }]}>
          Esta mascota está en modo recuerdo (solo lectura).
        </Text>
      )}

      {/* FAB */}
      {!isMemorialSelected && (
        <AnimatedPressable onPress={handleOpenAdd} style={[styles.fab, shadows.lg, { backgroundColor: t.accent }]}>
          <Icon name="add" size={26} color="#fff" />
        </AnimatedPressable>
      )}

      {/* Modal */}
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
              <Text style={[styles.modalTitle, { color: t.text }]}>
                {editingVaccine ? "Editar vacuna" : "Nueva vacuna"}
              </Text>
              {selectedPet?.name && (
                <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>
                  para {selectedPet.name}
                </Text>
              )}
            </View>
            <AnimatedPressable onPress={() => setModalOpen(false)} hitSlop={10}>
              <Icon name="close" size={24} color={t.textMuted} />
            </AnimatedPressable>
          </View>

          <ScrollView style={styles.scrollContent}>
            <Text style={[styles.label, { color: t.textMuted }]}>NOMBRE DE LA VACUNA *</Text>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              placeholder="Ej: Trivalente, Rabia, Moquillo..."
              placeholderTextColor={t.textMuted}
              style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
            />

            <Text style={[styles.label, { color: t.textMuted }]}>FECHA DE APLICACIÓN *</Text>
            <AnimatedPressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.input, styles.dateInput, { borderColor: t.border, backgroundColor: t.bg }]}
            >
              <Icon name="calendar-outline" size={20} color={t.textMuted} />
              <Text style={[styles.dateText, { color: t.text }]}>
                {formatDateDisplay(formDate)}
              </Text>
            </AnimatedPressable>
            {showDatePicker && (
              <DateTimePicker
                value={formDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
              />
            )}

            <Text style={[styles.label, { color: t.textMuted }]}>PRÓXIMA DOSIS (opcional)</Text>
            <AnimatedPressable
              onPress={() => setShowNextDosePicker(true)}
              style={[styles.input, styles.dateInput, { borderColor: t.border, backgroundColor: t.bg }]}
            >
              <Icon name="calendar-outline" size={20} color={t.textMuted} />
              <Text style={[styles.dateText, { color: formNextDose ? t.text : t.textMuted }]}>
                {formNextDose ? formatDateDisplay(formNextDose) : "Sin fecha"}
              </Text>
              {formNextDose && (
                <AnimatedPressable onPress={() => setFormNextDose(null)} hitSlop={8}>
                  <Icon name="close-circle" size={20} color={t.textMuted} />
                </AnimatedPressable>
              )}
            </AnimatedPressable>
            {showNextDosePicker && (
              <DateTimePicker
                value={formNextDose || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onNextDoseChange}
              />
            )}

            <Text style={[styles.label, { color: t.textMuted }]}>NOTAS (opcional)</Text>
            <TextInput
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="Observaciones, lote, veterinario..."
              placeholderTextColor={t.textMuted}
              multiline
              numberOfLines={3}
              style={[
                styles.textArea,
                { color: t.text, borderColor: t.border, backgroundColor: t.bg },
              ]}
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <AnimatedPressable
              onPress={() => setModalOpen(false)}
              style={[styles.btn, { backgroundColor: t.bg, borderColor: t.border }]}
            >
              <Text style={{ color: t.textMuted, fontWeight: "700" }}>Cancelar</Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={handleSave}
              style={[styles.btn, { backgroundColor: t.accent, borderColor: "transparent" }]}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Guardar</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 30, fontWeight: "700" },
  headerSubtitle: { fontSize: 14, fontWeight: "600", marginTop: 2 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: "700" },
  alertDate: { fontSize: 13, fontWeight: "600", marginTop: 2 },

  listContent: { paddingBottom: 80 },
  separator: { height: 10 },

  vaccineCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  vaccineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  vaccineInfo: { flex: 1, gap: 2 },
  vaccineName: { fontSize: 16, fontWeight: "800" },
  vaccineDate: { fontSize: 13, fontWeight: "600" },
  vaccineNext: { fontSize: 12, fontWeight: "600" },
  vaccineNotes: { fontSize: 12, fontWeight: "500", fontStyle: "italic", marginTop: 2 },

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
  },

  memorialHint: {
    marginVertical: 10,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
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
  scrollContent: { maxHeight: 400 },
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
    minHeight: 80,
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
