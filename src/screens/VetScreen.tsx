import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { shadows } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePet } from "../app/state/PetContext";
import { useVet, VetVisit } from "../app/state/VetContext";
import { useAds } from "../app/state/AdsContext";
import EditVetVisitModal from "../components/EditVetVisitModal";
import { formatTime } from "../utils/format";

export default function VetScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const { selectedPet, selectedPetId } = usePet();
  const { getVisitsByPet, deleteVisit, updateVisit, addVisit, markAsCompleted, isLoading } = useVet();
  const { incrementActionCount } = useAds();

  const isMemorialSelected = selectedPet?.status === "memorial";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VetVisit | null>(null);

  const { past, upcoming } = getVisitsByPet(selectedPetId);

  const handleAddVisit = () => {
    if (isMemorialSelected) return;
    setEditingVisit(null);
    setModalOpen(true);
  };

  const handleEditVisit = (visit: VetVisit) => {
    if (isMemorialSelected) return;
    setEditingVisit(visit);
    setModalOpen(true);
  };

  const handleDeleteVisit = (id: string) => {
    if (isMemorialSelected) return;

    Alert.alert(
      "Eliminar visita",
      "¿Estás seguro de que quieres eliminar esta visita?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteVisit(id),
        },
      ]
    );
  };

  const handleMarkAsCompleted = (id: string) => {
    if (isMemorialSelected) return;
    markAsCompleted(id);
  };

  const handleSaveVisit = (data: {
    type: 'PAST' | 'UPCOMING';
    date: string;
    time: string;
    veterinarian: string;
    reason: string;
    notes: string;
  }) => {
    const [year, month, day] = data.date.split('-').map(Number);
    const [hours, minutes] = data.time.split(':').map(Number);
    const dateObj = new Date(year, month - 1, day, hours, minutes);

    if (editingVisit) {
      updateVisit(editingVisit.id, {
        type: data.type,
        date: dateObj.toISOString(),
        veterinarian: data.veterinarian,
        reason: data.reason,
        notes: data.notes,
      });
    } else {
      addVisit({
        petId: selectedPetId,
        type: data.type,
        date: dateObj.toISOString(),
        veterinarian: data.veterinarian,
        reason: data.reason,
        notes: data.notes,
      });
    }

    // Incrementar contador para intersticiales
    incrementActionCount();

    setModalOpen(false);
    setEditingVisit(null);
  };

  const renderVisit = (visit: VetVisit, isUpcoming: boolean) => {
    const visitDate = new Date(visit.date);
    return (
      <AnimatedPressable
        onPress={() => handleEditVisit(visit)}
        onLongPress={() => handleDeleteVisit(visit.id)}
        disabled={isMemorialSelected}
        style={[
          styles.visitCard,
          shadows.md,
          {
            backgroundColor: t.card,
            borderColor: t.border,
            opacity: isMemorialSelected ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.visitHeader}>
          <View style={styles.visitHeaderLeft}>
            <View style={[styles.dateCircle, { backgroundColor: t.accentSoft }]}>
              <Text style={[styles.dateDay, { color: t.accent }]}>
                {visitDate.getDate()}
              </Text>
              <Text style={[styles.dateMonth, { color: t.accent }]}>
                {visitDate.toLocaleString('es', { month: 'short' }).toUpperCase()}
              </Text>
            </View>

            <View style={styles.visitInfo}>
              <Text style={[styles.visitReason, { color: t.text }]}>{visit.reason}</Text>
              <Text style={[styles.visitTime, { color: t.textMuted }]}>
                {formatTime(visitDate)} · {visit.veterinarian}
              </Text>
            </View>
          </View>

        {isUpcoming && !isMemorialSelected && (
          <AnimatedPressable
            onPress={() => handleMarkAsCompleted(visit.id)}
            style={[styles.completeBtn, { backgroundColor: t.accentSoft }]}
            hitSlop={8}
            scale={0.95}
          >
            <Icon name="checkmark" size={18} color={t.accent} />
          </AnimatedPressable>
        )}
      </View>

      {visit.notes && (
        <Text style={[styles.visitNotes, { color: t.textMuted }]} numberOfLines={2}>
          {visit.notes}
        </Text>
      )}

      <View style={styles.chevronContainer}>
        <Icon
          name="chevron-forward"
          size={18}
          color={t.textMuted}
        />
      </View>
    </AnimatedPressable>
    );
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
      style={[
        styles.screen,
        { backgroundColor: t.bg, paddingTop: insets.top + 6 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: t.text }]}>Veterinario</Text>
            {selectedPet?.name && (
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {selectedPet.name}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Upcoming Appointments */}
      {upcoming.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
              PRÓXIMAS CITAS
            </Text>
            <View style={[styles.badge, { backgroundColor: t.accent }]}>
              <Text style={styles.badgeText}>{upcoming.length}</Text>
            </View>
          </View>

          <FlatList
            data={upcoming}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderVisit(item, true)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        </>
      )}

      {/* Past Visits */}
      <View style={[styles.sectionHeader, { marginTop: upcoming.length > 0 ? 20 : 0 }]}>
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
          VISITAS REALIZADAS
        </Text>
      </View>

      <FlatList
        data={past}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderVisit(item, false)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="medkit-outline" size={48} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              No hay visitas registradas
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
        <AnimatedPressable
          onPress={handleAddVisit}
          style={[styles.fab, { backgroundColor: t.accent }, shadows.lg]}
          scale={0.95}
          haptic="medium"
        >
          <Icon name="add" size={26} color="#fff" />
        </AnimatedPressable>
      )}

      {/* Modal */}
      <EditVetVisitModal
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingVisit(null);
        }}
        onSave={handleSaveVisit}
        initialData={
          editingVisit
            ? (() => {
                const d = new Date(editingVisit.date);
                return {
                  type: editingVisit.type,
                  date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                  time: formatTime(d),
                  veterinarian: editingVisit.veterinarian,
                  reason: editingVisit.reason,
                  notes: editingVisit.notes,
                };
              })()
            : undefined
        }
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

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },

  listContent: { paddingBottom: 10 },
  separator: { height: 10 },

  visitCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    position: "relative",
  },
  visitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visitHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dateCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  dateMonth: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  visitInfo: { flex: 1, gap: 2, paddingRight: 10 },
  visitReason: { fontSize: 15, fontWeight: "800" },
  visitTime: { fontSize: 13, fontWeight: "600" },
  completeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  visitNotes: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 10,
    lineHeight: 18,
  },
  chevronContainer: {
    position: "absolute",
    right: 14,
    top: 14,
  },

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
});