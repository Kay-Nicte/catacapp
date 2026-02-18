import React, { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { shadows } from "../theme/tokens";
import { usePet } from "../app/state/PetContext";
import { useRecords, RecordType } from "../app/state/RecordsContext";
import PetAvatar from "../components/PetAvatar";
import RoutinesModal from "../components/RoutinesModal";
import EditRecordModal from "../components/EditRecordModal";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RootStackParamList } from "../app/navigation/AppStack";
import type { TabsParamList } from "../app/navigation/AppTabs";

type Summary = { id: string; icon: string; name: string; value: string; type: RecordType };

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabsParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

function prettyType(t: RecordType) {
  switch (t) {
    case "FOOD": return "Comidas";
    case "POOP": return "Deposiciones";
    case "SLEEP": return "Sueño";
    case "WEIGHT": return "Peso";
    case "NOTE": return "Notas";
  }
}

function getIcon(t: RecordType): string {
  switch (t) {
    case "FOOD": return "restaurant";
    case "POOP": return "water";
    case "SLEEP": return "moon";
    case "WEIGHT": return "fitness";
    case "NOTE": return "document-text";
  }
}

function calculateAge(birthDateISO?: string): string {
  if (!birthDateISO) return "";

  const now = new Date();
  const birth = new Date(birthDateISO);

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  // Ajustar si el día actual es menor al día de nacimiento
  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  if (years === 0) {
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  } else if (months === 0) {
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  } else {
    return `${years} ${years === 1 ? 'año' : 'años'} ${months}m`;
  }
}

export default function HomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const { pets, selectedPetId, setSelectedPetId, selectedPet } = usePet();
  const { getRecordsByDate, getRecordsByPet, getTodayRoutines, confirmRoutine, skipRoutine } = useRecords();
  
  const [routinesModalVisible, setRoutinesModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<{
    id: string;
    type: RecordType;
    title: string;
    time: string;
    defaultValue?: string;
  } | null>(null);
  
  const isMemorialSelected = selectedPet?.status === "memorial";
  const todayRecords = getRecordsByDate(new Date(), selectedPetId);
  const todayRoutines = getTodayRoutines(selectedPetId);
  const pendingRoutines = todayRoutines.filter(r => r.status === "PENDING");

  // Resumen del día
  const summary: Summary[] = useMemo(() => {
    const foodRecords = todayRecords.filter(r => r.type === "FOOD");
    const poopRecords = todayRecords.filter(r => r.type === "POOP");
    const sleepRecords = todayRecords.filter(r => r.type === "SLEEP");

    const lastPoopTimestamp = poopRecords.length > 0 ? poopRecords[0].timestamp : null;
    const lastPoop = lastPoopTimestamp ? new Date(lastPoopTimestamp) : null;

    const totalSleep = sleepRecords.reduce((acc, r) => {
      const match = r.value.match(/(\d+)/);
      return acc + (match ? parseInt(match[0]) : 0);
    }, 0);

    // Último peso registrado (de todos los records, no solo hoy)
    const allPetRecords = getRecordsByPet(selectedPetId);
    const weightRecords = allPetRecords
      .filter(r => r.type === "WEIGHT")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const lastWeight = weightRecords.length > 0 ? weightRecords[0].value : null;

    return [
      {
        id: "s1",
        icon: getIcon("FOOD"),
        name: prettyType("FOOD"),
        value: foodRecords.length > 0 ? `${foodRecords.length} registradas` : "Sin registros",
        type: "FOOD",
      },
      {
        id: "s2",
        icon: getIcon("POOP"),
        name: prettyType("POOP"),
        value: lastPoop
          ? `${lastPoop.getHours()}:${String(lastPoop.getMinutes()).padStart(2, "0")}h`
          : "Sin registros",
        type: "POOP",
      },
      {
        id: "s3",
        icon: getIcon("SLEEP"),
        name: prettyType("SLEEP"),
        value: totalSleep > 0 ? `${totalSleep} horas` : "Sin registros",
        type: "SLEEP",
      },
      {
        id: "s4",
        icon: getIcon("WEIGHT"),
        name: prettyType("WEIGHT"),
        value: lastWeight || "Sin registros",
        type: "WEIGHT",
      },
    ];
  }, [todayRecords, getRecordsByPet, selectedPetId]);

  const handleConfirmRoutine = (routineId: string, defaultValue?: string, routineTime?: string) => {
    if (isMemorialSelected) return;
    confirmRoutine(routineId, selectedPetId, {
      value: defaultValue || '—',
      time: routineTime || '00:00',
    });
  };

  const handleEditRoutine = (
    routineId: string,
    type: RecordType,
    title: string,
    time: string,
    defaultValue?: string
  ) => {
    if (isMemorialSelected) return;
    setEditingRoutine({ id: routineId, type, title, time, defaultValue });
    setEditModalVisible(true);
  };

  const handleSaveEditedRoutine = (data: {
    type: RecordType;
    title: string;
    time: string;
    value: string;
  }) => {
    if (editingRoutine) {
      confirmRoutine(editingRoutine.id, selectedPetId, {
        value: data.value,
        time: data.time,
      });
      setEditingRoutine(null);
    }
  };

  // Header del FlatList
  const ListHeaderComponent = () => (
    <>
      {/* Pets grid */}
      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 10 }}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const selected = item.id === selectedPetId;
          const memorial = item.status === "memorial";
          const age = memorial ? "Recuerdo" : calculateAge(item.birthDate);

          return (
            <AnimatedPressable
              onPress={() => setSelectedPetId(item.id)}
              onLongPress={() => navigation.navigate("PetForm", { petId: item.id })}
              style={[
                styles.petCard,
                {
                  backgroundColor: t.card,
                  borderColor: selected ? t.accent : "transparent",
                  opacity: memorial ? 0.55 : 1,
                  ...shadows.md,
                },
              ]}
            >
              <PetAvatar avatarKey={item.avatarKey} memorial={memorial} size={92} />
              <Text style={[styles.petName, { color: t.text }]}>{item.name}</Text>
              {age && (
                <Text style={[styles.petStatus, { color: t.textMuted }]}>
                  {age}
                </Text>
              )}
            </AnimatedPressable>
          );
        }}
      />

      {/* Tarjeta de gestión de rutinas */}
      <View
        style={[
          styles.summary,
          { backgroundColor: t.card, borderColor: t.border, ...shadows.sm },
        ]}
      >
        <View style={styles.summaryLeft}>
          <Text style={[styles.summaryTitle, { color: t.text }]}>Rutinas</Text>
          <Text style={[styles.summarySub, { color: t.textMuted }]}>
            {pendingRoutines.length > 0
              ? `${pendingRoutines.length} pendiente${pendingRoutines.length === 1 ? "" : "s"}`
              : "Todo al día"}
          </Text>
        </View>

        <Pressable
          onPress={() => setRoutinesModalVisible(true)}
          style={[styles.summaryRight, { opacity: isMemorialSelected ? 0.4 : 1 }]}
          disabled={isMemorialSelected}
        >
          <Text style={[styles.summaryLink, { color: t.textMuted }]}>
            Gestionar
          </Text>
          <Icon name="chevron-forward" size={16} color={t.textMuted} />
        </Pressable>
      </View>

      {/* Rutinas pendientes */}
      {pendingRoutines.length > 0 && !isMemorialSelected && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
              RUTINAS PENDIENTES
            </Text>
            <Text style={[styles.badge, { backgroundColor: t.accent }]}>
              {pendingRoutines.length}
            </Text>
          </View>

          <View style={[styles.routinesCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
            {pendingRoutines.map((routine, idx) => (
              <View key={routine.id}>
                <View style={styles.routineRow}>
                  <View style={styles.routineLeft}>
                    <Text style={[styles.routineName, { color: t.text }]}>
                      {prettyType(routine.type)} · {routine.title}
                    </Text>
                    <Text style={[styles.routineTime, { color: t.textMuted }]}>
                      {routine.time}
                      {routine.defaultValue && ` · ${routine.defaultValue}`}
                    </Text>
                  </View>

                  <View style={styles.routineActions}>
                    <AnimatedPressable
                      onPress={() => handleConfirmRoutine(routine.id, routine.defaultValue, routine.time)}
                      style={[styles.iconPill, { backgroundColor: t.accentSoft }]}
                      hitSlop={8}
                      haptic="medium"
                    >
                      <Icon name="checkmark" size={18} color={t.accent} />
                    </AnimatedPressable>

                    <AnimatedPressable
                      onPress={() =>
                        handleEditRoutine(
                          routine.id,
                          routine.type,
                          routine.title,
                          routine.time,
                          routine.defaultValue
                        )
                      }
                      style={[
                        styles.iconPill,
                        { backgroundColor: t.card, borderColor: t.border, borderWidth: 1 },
                      ]}
                      hitSlop={8}
                    >
                      <Icon name="pencil" size={16} color={t.textMuted} />
                    </AnimatedPressable>

                    <AnimatedPressable
                      onPress={() => skipRoutine(routine.id)}
                      style={[
                        styles.iconPill,
                        { backgroundColor: t.card, borderColor: t.border, borderWidth: 1 },
                      ]}
                      hitSlop={8}
                    >
                      <Icon name="close" size={18} color={t.textMuted} />
                    </AnimatedPressable>
                  </View>
                </View>
                {idx !== pendingRoutines.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: t.border }]} />
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Resumen del día */}
      <Text style={[styles.sectionTitle, { color: t.textMuted, marginTop: 14 }]}>
        RESUMEN DE HOY
      </Text>
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: t.text }]}>Inicio</Text>
        </View>

        <View style={styles.headerRight}>
          <AnimatedPressable
            onPress={() => navigation.navigate("Registros")}
            hitSlop={10}
            style={styles.iconBtn}
            scale={0.9}
          >
            <Icon name="calendar" size={20} color={t.textMuted} />
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => navigation.navigate("PetForm")}
            style={[styles.addBtn, { backgroundColor: t.card, borderColor: t.border }]}
          >
            <Text style={[styles.addBtnText, { color: t.textMuted }]}>Añadir</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Contenido con FlatList */}
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={ListHeaderComponent}
        data={summary}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AnimatedPressable
            onPress={() => navigation.navigate("Registros")}
            style={[
              styles.summaryRow,
              {
                backgroundColor: t.card,
                borderColor: t.border,
                ...shadows.sm,
              },
            ]}
          >
            <View style={styles.summaryRowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: t.accentSoft }]}>
                <Icon name={item.icon} size={20} color={t.accent} />
              </View>
              <Text style={[styles.summaryName, { color: t.text }]}>{item.name}</Text>
            </View>

            <View style={styles.summaryRowRight}>
              <Text style={[styles.summaryValue, { color: t.textMuted }]}>{item.value}</Text>
              <Icon name="chevron-forward" size={18} color={t.textMuted} />
            </View>
          </AnimatedPressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: t.border }]} />
        )}
        ListFooterComponent={
          <>
            {isMemorialSelected && (
              <Text style={[styles.memorialHint, { color: t.textMuted }]}>
                Esta mascota está en modo recuerdo (solo lectura).
              </Text>
            )}

            <Text style={[styles.tip, { color: t.textMuted }]}>
              Tip: mantén pulsada una mascota para editarla.
            </Text>
          </>
        }
      />

      {/* Modal de rutinas */}
      <RoutinesModal
        visible={routinesModalVisible}
        onClose={() => setRoutinesModalVisible(false)}
        petId={selectedPetId}
      />

      {/* Modal de edición */}
      <EditRecordModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingRoutine(null);
        }}
        onSave={handleSaveEditedRoutine}
        initialData={
          editingRoutine
            ? {
                type: editingRoutine.type,
                title: editingRoutine.title,
                time: editingRoutine.time,
                value: editingRoutine.defaultValue || "",
              }
            : undefined
        }
        mode="confirm"
        petName={selectedPet?.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
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
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  addBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 13, fontWeight: "600" },

  container: { paddingHorizontal: 20 },
  contentContainer: { paddingTop: 10, paddingBottom: 10 },

  petCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 2,
  },
  petName: { fontSize: 18, fontWeight: "700", marginTop: 10 },
  petStatus: { marginTop: 2, fontSize: 13, fontWeight: "500" },

  summary: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 8,
  },
  summaryLeft: { gap: 2 },
  summaryTitle: { fontSize: 16, fontWeight: "800" },
  summarySub: { fontSize: 12, fontWeight: "600" },
  summaryRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryLink: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
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
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 20,
  },

  routinesCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  routineRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routineLeft: { flex: 1, paddingRight: 10, gap: 2 },
  routineName: { fontSize: 14, fontWeight: "800" },
  routineTime: { fontSize: 12, fontWeight: "600" },
  routineActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
  },
  summaryRowLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryName: { fontSize: 16, fontWeight: "600" },
  summaryRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryValue: { fontSize: 14, fontWeight: "500" },
  
  separator: { height: 1, opacity: 0.9, marginBottom: 10 },
  divider: { height: 1, opacity: 0.9, marginTop: 12 },

  memorialHint: { marginTop: 10, fontSize: 12, fontWeight: "600" },
  tip: { marginTop: 10, fontSize: 12, fontWeight: "600" },
});