import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Modal, Switch, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { shadows } from "../theme/tokens";
import { useAuth } from "../app/state/AuthContext";
import { usePet } from "../app/state/PetContext";
import type { Pet } from "../app/state/PetContext";
import { useRecords, RecordType } from "../app/state/RecordsContext";
import PetAvatar from "../components/PetAvatar";
import RoutinesModal from "../components/RoutinesModal";
import EditRecordModal from "../components/EditRecordModal";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/layout/ScreenContainer";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RootStackParamList } from "../app/navigation/AppStack";
import type { TabsParamList } from "../app/navigation/AppTabs";

import { fonts } from '../theme/fonts';
const SUMMARY_PREFS_KEY = "@catacapp_summary_prefs";
type SummaryPrefs = Record<string, boolean>; // keyed by RecordType
const DEFAULT_PREFS: SummaryPrefs = { FOOD: true, POOP: true, SLEEP: true, WEIGHT: true };

type Summary = { id: string; icon: string; name: string; value: string; type: RecordType };

type PetFilter = "all" | "active" | "memorial" | "archived";

type PetGridItem = Pet | { id: "__spacer__" };

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabsParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

function getIcon(t: RecordType): string {
  switch (t) {
    case "FOOD": return "restaurant";
    case "POOP": return "water";
    case "SLEEP": return "moon";
    case "WEIGHT": return "fitness";
    case "WALK": return "walk";
    case "NOTE": return "document-text";
    default: return "ellipse";
  }
}

function calculateAge(birthDateISO: string | undefined, tr: (key: string, opts?: any) => string): string {
  if (!birthDateISO) return "";
  const now = new Date();
  const birth = new Date(birthDateISO);
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (now.getDate() < birth.getDate()) { months--; if (months < 0) { years--; months += 12; } }
  if (years === 0) {
    return tr('home.age.months', { count: months });
  } else if (months === 0) {
    return tr('home.age.years', { count: years });
  } else {
    const yearLabel = tr('home.age.years', { count: years });
    return `${yearLabel} ${months}m`;
  }
}

export default function HomeScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const { user } = useAuth();
  const { pets, selectedPetId, setSelectedPetId, selectedPet, defaultPetId, isLoading: isPetsLoading, refreshPets } = usePet();
  const { getRecordsByDate, getRecordsByPet, getTodayRoutines, confirmRoutine, skipRoutine, isLoading: isRecordsLoading } = useRecords();

  const [routinesModalVisible, setRoutinesModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [summaryPrefs, setSummaryPrefs] = useState<SummaryPrefs>(DEFAULT_PREFS);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [petFilter, setPetFilter] = useState<PetFilter>("all");
  const [editingRoutine, setEditingRoutine] = useState<{
    id: string;
    type: RecordType;
    title: string;
    time: string;
    defaultValue?: string;
  } | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const isLoading = isPetsLoading || isRecordsLoading;
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshPets();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshPets]);

  const isMemorialSelected = selectedPet?.status === "memorial";

  // Check if there are memorial or archived pets (for showing filter chips)
  const hasMemorial = pets.some(p => p.status === "memorial");
  const hasArchived = pets.some(p => p.status === "archived");
  const showFilters = hasMemorial || hasArchived;

  // Filter → Sort → Spacer pipeline
  const petsGridData: PetGridItem[] = useMemo(() => {
    let filtered: Pet[];
    switch (petFilter) {
      case "active":
        filtered = pets.filter(p => p.status === "active");
        break;
      case "memorial":
        filtered = pets.filter(p => p.status === "memorial");
        break;
      case "archived":
        filtered = pets.filter(p => p.status === "archived");
        break;
      case "all":
      default:
        // "All" excludes archived
        filtered = pets.filter(p => p.status !== "archived");
        break;
    }

    // Sort: active first, memorial last
    const sorted = [...filtered].sort((a, b) => {
      const order = { active: 0, memorial: 1, archived: 2 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });

    // Add spacer if odd count for 2-column grid
    const result: PetGridItem[] = [...sorted];
    if (result.length % 2 !== 0) {
      result.push({ id: "__spacer__" });
    }
    return result;
  }, [pets, petFilter]);

  // Cargar preferencias de resumen
  const prefsKey = `${SUMMARY_PREFS_KEY}_${user?.id}`;
  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(prefsKey).then((raw) => {
      if (raw) setSummaryPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    });
  }, [user, prefsKey]);

  const toggleSummaryPref = useCallback(
    (type: string) => {
      setSummaryPrefs((prev) => {
        const next = { ...prev, [type]: !prev[type] };
        AsyncStorage.setItem(prefsKey, JSON.stringify(next));
        return next;
      });
    },
    [prefsKey]
  );
  const todayRecords = getRecordsByDate(new Date(), selectedPetId);
  const todayRoutines = getTodayRoutines(selectedPetId);
  const pendingRoutines = todayRoutines.filter(r => r.status === "PENDING");

  // Resumen del día
  const summary: Summary[] = useMemo(() => {
    const foodRecords = todayRecords.filter(r => r.type === "FOOD");
    const poopRecords = todayRecords.filter(r => r.type === "POOP");
    const sleepRecords = todayRecords.filter(r => r.type === "SLEEP");
    const walkRecords = todayRecords.filter(r => r.type === "WALK");

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
        name: tr('common.recordType.FOOD'),
        value: foodRecords.length > 0 ? tr('home.registered', { count: foodRecords.length }) : tr('home.noRecords'),
        type: "FOOD",
      },
      {
        id: "s2",
        icon: getIcon("POOP"),
        name: tr('common.recordType.POOP'),
        value: lastPoop
          ? `${lastPoop.getHours()}:${String(lastPoop.getMinutes()).padStart(2, "0")}h`
          : tr('home.noRecords'),
        type: "POOP",
      },
      {
        id: "s3",
        icon: getIcon("SLEEP"),
        name: tr('common.recordType.SLEEP'),
        value: totalSleep > 0 ? tr('home.hours', { count: totalSleep }) : tr('home.noRecords'),
        type: "SLEEP",
      },
      {
        id: "s4",
        icon: getIcon("WEIGHT"),
        name: tr('common.recordType.WEIGHT'),
        value: lastWeight || tr('home.noRecords'),
        type: "WEIGHT",
      },
      {
        id: "s5",
        icon: getIcon("WALK"),
        name: tr('common.recordType.WALK'),
        value: walkRecords.length > 0 ? tr('home.registered', { count: walkRecords.length }) : tr('home.noRecords'),
        type: "WALK",
      },
    ];
  }, [todayRecords, getRecordsByPet, selectedPetId, tr]);

  const visibleSummary = useMemo(
    () => summary.filter((s) => summaryPrefs[s.type] !== false),
    [summary, summaryPrefs]
  );

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

  // Filter chip component
  const FilterChip = ({ label, value }: { label: string; value: PetFilter }) => {
    const active = petFilter === value;
    return (
      <Pressable
        onPress={() => setPetFilter(value)}
        style={[
          styles.filterChip,
          {
            backgroundColor: active ? t.accentSoft : t.card,
            borderColor: active ? "transparent" : t.border,
          },
        ]}
      >
        <Text
          style={{
            color: active ? t.accent : t.textMuted,
            fontFamily: fonts.extraBold,
            fontSize: 12,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  // Header del FlatList
  const ListHeaderComponent = () => (
    <>
      {/* Filter chips */}
      {showFilters && (
        <View style={styles.filterRow}>
          <FilterChip label={tr('home.filterAll')} value="all" />
          <FilterChip label={tr('home.filterActive')} value="active" />
          {hasMemorial && <FilterChip label={tr('home.filterMemorial')} value="memorial" />}
          {hasArchived && <FilterChip label={tr('home.filterArchived')} value="archived" />}
        </View>
      )}

      {/* Pets grid */}
      <FlatList
        data={petsGridData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 10 }}
        scrollEnabled={false}
        renderItem={({ item }) => {
          // Spacer item
          if (item.id === "__spacer__") {
            return <View style={{ flex: 1 }} />;
          }

          const pet = item as Pet;
          const selected = pet.id === selectedPetId;
          const memorial = pet.status === "memorial";
          const archived = pet.status === "archived";
          const isDefault = pet.id === defaultPetId;
          const age = memorial
            ? tr('home.remembered')
            : archived
              ? tr('pets.archivedMode')
              : calculateAge(pet.birthDate, tr);

          return (
            <AnimatedPressable
              onPress={() => setSelectedPetId(pet.id)}
              onLongPress={() => navigation.navigate("PetForm", { petId: pet.id })}
              style={[
                styles.petCard,
                {
                  backgroundColor: t.card,
                  borderColor: selected ? t.accent : "transparent",
                  opacity: memorial || archived ? 0.55 : 1,
                  ...shadows.md,
                },
              ]}
            >
              {isDefault && (
                <View style={styles.defaultStar}>
                  <Icon name="star" size={14} color={t.accent} />
                </View>
              )}
              <PetAvatar avatarKey={pet.avatarKey} memorial={memorial || archived} size={92} />
              <Text style={[styles.petName, { color: t.text }]}>{pet.name}</Text>
              {age ? (
                <Text style={[styles.petStatus, { color: t.textMuted }]}>
                  {age}
                </Text>
              ) : null}
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
          <Text style={[styles.summaryTitle, { color: t.text }]}>{tr('home.routines')}</Text>
          <Text style={[styles.summarySub, { color: t.textMuted }]}>
            {pendingRoutines.length > 0
              ? tr('home.pending', { count: pendingRoutines.length })
              : tr('home.allDone')}
          </Text>
        </View>

        <Pressable
          onPress={() => setRoutinesModalVisible(true)}
          style={[styles.summaryRight, { opacity: isMemorialSelected ? 0.4 : 1 }]}
          disabled={isMemorialSelected}
        >
          <Text style={[styles.summaryLink, { color: t.textMuted }]}>
            {tr('home.manage')}
          </Text>
          <Icon name="chevron-forward" size={16} color={t.textMuted} />
        </Pressable>
      </View>

      {/* Rutinas pendientes */}
      {pendingRoutines.length > 0 && !isMemorialSelected && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
              {tr('home.pendingRoutines')}
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
                    <Text numberOfLines={1} style={[styles.routineName, { color: t.text }]}>
                      {tr('common.recordType.' + routine.type)} · {routine.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.routineTime, { color: t.textMuted }]}>
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
      <View style={[styles.sectionHeader, { marginTop: 14 }]}>
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>
          {tr('home.todaySummary')}
        </Text>
        <AnimatedPressable
          onPress={() => setSummaryModalVisible(true)}
          hitSlop={10}
          scale={0.9}
        >
          <Icon name="pencil" size={14} color={t.textMuted} />
        </AnimatedPressable>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6 }]}>
      <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: t.text }]}>{tr('home.title')}</Text>
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
            <Text style={[styles.addBtnText, { color: t.textMuted }]}>{tr('home.add')}</Text>
          </AnimatedPressable>
        </View>
      </View>

      {pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: t.accentSoft }]}>
            <Icon name="paw" size={48} color={t.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: t.text }]}>
            {tr('home.emptyTitle')}
          </Text>
          <Text style={[styles.emptyDesc, { color: t.textMuted }]}>
            {tr('home.emptyDesc')}
          </Text>
          <AnimatedPressable
            onPress={() => navigation.navigate("PetForm")}
            style={[styles.emptyBtn, { backgroundColor: t.accent }]}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>{tr('home.emptyBtn')}</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={ListHeaderComponent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
          data={visibleSummary}
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
                <Text numberOfLines={1} style={[styles.summaryName, { color: t.text }]}>{item.name}</Text>
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
          ListEmptyComponent={
            <Text style={[styles.summaryEmpty, { color: t.textMuted }]}>
              {tr('home.noCards')}
            </Text>
          }
          ListFooterComponent={
            <>
              {isMemorialSelected && (
                <Text style={[styles.memorialHint, { color: t.textMuted }]}>
                  {tr('home.memorialHint')}
                </Text>
              )}

              <Text style={[styles.tip, { color: t.textMuted }]}>
                {tr('home.tip')}
              </Text>
            </>
          }
        />
      )}

      </ScreenContainer>

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

      {/* Modal de personalizar resumen */}
      <Modal
        visible={summaryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSummaryModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSummaryModalVisible(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: t.card }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: t.text }]}>
              {tr('home.customizeSummary')}
            </Text>
            <Text style={[styles.modalDesc, { color: t.textMuted }]}>
              {tr('home.customizeDesc')}
            </Text>

            {(["FOOD", "POOP", "SLEEP", "WEIGHT"] as RecordType[]).map((type) => (
              <View
                key={type}
                style={[styles.prefRow, { borderBottomColor: t.border }]}
              >
                <View style={styles.prefLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: t.accentSoft }]}>
                    <Icon name={getIcon(type)} size={20} color={t.accent} />
                  </View>
                  <Text style={[styles.prefLabel, { color: t.text }]}>
                    {tr('common.recordType.' + type)}
                  </Text>
                </View>
                <Switch
                  value={summaryPrefs[type] !== false}
                  onValueChange={() => toggleSummaryPref(type)}
                  trackColor={{ false: t.border, true: t.accent }}
                  thumbColor="#fff"
                />
              </View>
            ))}

            <AnimatedPressable
              onPress={() => setSummaryModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: t.accent }]}
            >
              <Text style={styles.modalCloseBtnText}>{tr('common.done')}</Text>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    fontFamily: fonts.bold,
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
  addBtnText: { fontSize: 13, fontFamily: fonts.semiBold },

  container: { paddingHorizontal: 20 },
  contentContainer: { paddingTop: 10, paddingBottom: 10 },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  petCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 2,
    position: "relative",
  },
  petName: { fontSize: 18, fontFamily: fonts.bold, marginTop: 10 },
  petStatus: { marginTop: 2, fontSize: 13, fontFamily: fonts.medium },
  defaultStar: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
  },

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
  summaryTitle: { fontSize: 16, fontFamily: fonts.extraBold },
  summarySub: { fontSize: 12, fontFamily: fonts.semiBold },
  summaryRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryLink: { fontSize: 12, fontFamily: fonts.extraBold, letterSpacing: 0.6 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.black,
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
    fontFamily: fonts.extraBold,
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
  routineName: { fontSize: 14, fontFamily: fonts.extraBold, flexShrink: 1 },
  routineTime: { fontSize: 12, fontFamily: fonts.semiBold, flexShrink: 1 },
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
  summaryName: { fontSize: 16, fontFamily: fonts.semiBold, flexShrink: 1 },
  summaryRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  summaryValue: { fontSize: 14, fontFamily: fonts.medium },

  separator: { height: 1, opacity: 0.9, marginBottom: 10 },
  divider: { height: 1, opacity: 0.9, marginTop: 12 },

  memorialHint: { marginTop: 10, fontSize: 12, fontFamily: fonts.semiBold },
  tip: { marginTop: 10, fontSize: 12, fontFamily: fonts.semiBold },
  summaryEmpty: { fontSize: 13, fontFamily: fonts.medium, textAlign: "center", paddingVertical: 20 },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: fonts.extraBold,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: fonts.medium,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 25,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.extraBold,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.extraBold,
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: fonts.medium,
    marginBottom: 20,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  prefLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prefLabel: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  modalCloseBtn: {
    marginTop: 24,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.extraBold,
  },
});
