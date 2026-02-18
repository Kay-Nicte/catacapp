import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { usePet } from "../app/state/PetContext";
import { usePremium, FREE_LIMITS } from "../app/state/PremiumContext";
import PetAvatar from "../components/PetAvatar";
import { premiumAvatars, premiumPetTypes } from "../assets/avatars";
import { Icon } from "../components/ui/Icon";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../app/navigation/AppStack";

export default function PetFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PetForm">>();

  const { pets, addPet, updatePet, markPetDeceased, reactivatePet, deletePet } =
    usePet();
  const { isPremium } = usePremium();

  const petId = route.params?.petId;
  const editing = Boolean(petId);
  const pet = pets.find((p) => p.id === petId);

  const isMemorial = pet?.status === "memorial";
  const readOnly = isMemorial; // en recuerdo: solo lectura

  const avatarOptionsCat = useMemo(
    () => ["cat_gray_01", "cat_black_01", "cat_orange_01", "cat_white_01", "cat_bengala", "cat_mainecoon", "cat_siames"],
    []
  );
  const avatarOptionsDog = useMemo(
    () => ["dog_yellow_01", "dog_black_01", "dog_white_01", "dog_brown_01", "dog_husky", "dog_shibainu"],
    []
  );
  const avatarOptionsRabbit = useMemo(
    () => ["rabbit_white", "rabbit_brown", "rabbit_gray", "rabbit_brown_kawaii"],
    []
  );
  const avatarOptionsHamster = useMemo(
    () => ["hamster_golden", "hamster_white", "hamster_gray", "hamster_golden_kawaii"],
    []
  );
  const avatarOptionsBird = useMemo(
    () => ["bird_canary", "bird_parrot", "bird_cockatiel"],
    []
  );
  const avatarOptionsIguana = useMemo(
    () => ["iguana_green", "iguana_blue"],
    []
  );
  const avatarOptionsSnake = useMemo(
    () => ["snake_python", "snake_corn"],
    []
  );

  const [name, setName] = useState(pet?.name ?? "");
  const [type, setType] = useState<"cat" | "dog" | "rabbit" | "hamster" | "bird" | "iguana" | "snake">(pet?.type ?? "cat");
  const [avatarKey, setAvatarKey] = useState(pet?.avatarKey ?? "cat_gray_01");
  const [birthDate, setBirthDate] = useState<Date | null>(() => {
    if (pet?.birthDate) {
      return new Date(pet.birthDate);
    }
    return null;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const options = useMemo(() => {
    switch (type) {
      case "cat": return avatarOptionsCat;
      case "dog": return avatarOptionsDog;
      case "rabbit": return avatarOptionsRabbit;
      case "hamster": return avatarOptionsHamster;
      case "bird": return avatarOptionsBird;
      case "iguana": return avatarOptionsIguana;
      case "snake": return avatarOptionsSnake;
      default: return avatarOptionsCat;
    }
  }, [type, avatarOptionsCat, avatarOptionsDog, avatarOptionsRabbit, avatarOptionsHamster, avatarOptionsBird, avatarOptionsIguana, avatarOptionsSnake]);

  function save() {
    if (readOnly) return;

    const clean = name.trim();
    if (!clean) {
      Alert.alert("Falta nombre", "Ponle un nombre a la mascota.");
      return;
    }

    const birthDateISO = birthDate ? birthDate.toISOString() : undefined;

    if (editing && petId) {
      updatePet(petId, { id: petId, name: clean, type, avatarKey, birthDate: birthDateISO });
      nav.goBack();
      return;
    }

    // Verificar limite de mascotas para usuarios free
    const activePets = pets.filter(p => p.status === "active").length;
    if (activePets >= FREE_LIMITS.maxPets && !isPremium) {
      Alert.alert(
        "Límite alcanzado",
        `Con el plan gratuito puedes tener hasta ${FREE_LIMITS.maxPets} mascotas activas. Hazte Premium para añadir mascotas ilimitadas.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Ver Premium", onPress: () => (nav as any).navigate("Premium") },
        ]
      );
      return;
    }

    addPet({ name: clean, type, avatarKey, birthDate: birthDateISO });
    nav.goBack();
  }

  function confirmMarkDeceased() {
    if (!editing || !petId) return;

    Alert.alert(
      "Marcar como fallecido",
      "Esto pondrá la ficha en modo recuerdo (solo lectura). Se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Marcar",
          style: "destructive",
          onPress: () => {
            markPetDeceased(petId, new Date().toISOString());
            nav.goBack();
          },
        },
      ]
    );
  }

  function confirmReactivate() {
    if (!editing || !petId) return;

    Alert.alert(
      "Reactivar mascota",
      "Volverá a estar activa y podrás registrar cosas de nuevo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reactivar",
          onPress: () => {
            reactivatePet(petId);
            nav.goBack();
          },
        },
      ]
    );
  }

  function confirmDelete() {
    if (!editing || !petId) return;

    Alert.alert(
      "Eliminar ficha",
      "Esto borra la mascota y sus datos (cuando tengamos DB será definitivo).",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            deletePet(petId);
            nav.goBack();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: 18 + 56 + 16 + insets.bottom, // espacio para el footer + safe area
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Preview */}
        <View
          style={[
            styles.preview,
            { backgroundColor: t.card, borderColor: t.border },
          ]}
        >
          <PetAvatar avatarKey={avatarKey} memorial={isMemorial} size={110} />
          <Text style={[styles.previewText, { color: t.textMuted }]}>
            {isMemorial ? "Modo recuerdo" : "Vista previa"}
          </Text>
        </View>

        {/* Nombre */}
        <Text style={[styles.label, { color: t.textMuted }]}>Nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={!readOnly}
          placeholder="Ej: Perla"
          placeholderTextColor={t.textMuted}
          style={[
            styles.input,
            { borderColor: t.border, color: t.text, opacity: readOnly ? 0.5 : 1 },
          ]}
        />

        {/* Fecha de nacimiento */}
        <Text style={[styles.label, { color: t.textMuted }]}>Fecha de nacimiento (opcional)</Text>
        <Pressable
          onPress={() => !readOnly && setShowDatePicker(true)}
          style={[
            styles.dateButton,
            { borderColor: t.border, opacity: readOnly ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.dateText, { color: birthDate ? t.text : t.textMuted }]}>
            {birthDate ? formatDate(birthDate) : "Seleccionar fecha"}
          </Text>
        </Pressable>
        {birthDate && !readOnly && (
          <Pressable onPress={() => setBirthDate(null)} style={styles.clearDate}>
            <Text style={[styles.clearDateText, { color: t.textMuted }]}>Quitar fecha</Text>
          </Pressable>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={birthDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
        {Platform.OS === 'ios' && showDatePicker && (
          <Pressable onPress={() => setShowDatePicker(false)} style={styles.doneButton}>
            <Text style={[styles.doneButtonText, { color: t.accent }]}>Listo</Text>
          </Pressable>
        )}

        {/* Tipo */}
        <Text style={[styles.label, { color: t.textMuted }]}>Tipo</Text>
        <View style={styles.typeGrid}>
          {[
            { key: "cat", label: "Gato", defaultAvatar: "cat_gray_01" },
            { key: "dog", label: "Perro", defaultAvatar: "dog_yellow_01" },
            { key: "rabbit", label: "Conejo", defaultAvatar: "rabbit_white" },
            { key: "hamster", label: "Hamster", defaultAvatar: "hamster_golden" },
            { key: "bird", label: "Pájaro", defaultAvatar: "bird_canary" },
            { key: "iguana", label: "Iguana", defaultAvatar: "iguana_green" },
            { key: "snake", label: "Serpiente", defaultAvatar: "snake_python" },
          ].map((item) => {
            const isSelected = type === item.key;
            const isTypeLocked = premiumPetTypes.has(item.key) && !isPremium;
            return (
              <Pressable
                key={item.key}
                disabled={readOnly}
                onPress={() => {
                  if (isTypeLocked) {
                    Alert.alert(
                      "Tipo Premium",
                      "Este tipo de mascota es exclusivo para usuarios Premium.",
                      [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Ver Premium", onPress: () => (nav as any).navigate("Premium") },
                      ]
                    );
                    return;
                  }
                  setType(item.key as typeof type);
                  if (!avatarKey.startsWith(`${item.key}_`)) setAvatarKey(item.defaultAvatar);
                }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isSelected ? t.accentSoft : t.card,
                    borderColor: isSelected ? "transparent" : t.border,
                    opacity: readOnly ? 0.5 : isTypeLocked ? 0.55 : 1,
                  },
                ]}
              >
                <Text style={{ color: isSelected ? t.accent : t.textMuted, fontWeight: "800", fontSize: 12 }}>
                  {item.label}
                </Text>
                {isTypeLocked && (
                  <View style={[styles.typeLock, { backgroundColor: t.accent }]}>
                    <Icon name="lock-closed" size={8} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Avatar */}
        <Text style={[styles.label, { color: t.textMuted }]}>Avatar</Text>
        <View style={styles.avatarGrid}>
          {options.map((k) => {
            const selected = k === avatarKey;
            const isLocked = premiumAvatars.has(k) && !isPremium;
            return (
              <Pressable
                key={k}
                disabled={readOnly}
                onPress={() => {
                  if (isLocked) {
                    Alert.alert(
                      "Avatar Premium",
                      "Este avatar es exclusivo para usuarios Premium.",
                      [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Ver Premium", onPress: () => (nav as any).navigate("Premium") },
                      ]
                    );
                    return;
                  }
                  setAvatarKey(k);
                }}
                style={[
                  styles.avatarTile,
                  {
                    borderColor: selected ? t.accent : t.border,
                    backgroundColor: t.card,
                    opacity: readOnly ? 0.5 : isLocked ? 0.55 : 1,
                  },
                ]}
              >
                <PetAvatar avatarKey={k} size={70} memorial={false} />
                {isLocked && (
                  <View style={[styles.avatarLock, { backgroundColor: t.accent }]}>
                    <Icon name="lock-closed" size={10} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Estado (bien colocado, sin cortarse) */}
        {editing && pet && (
          <View style={[styles.stateBox, { borderColor: t.border, backgroundColor: t.card }]}>
            <Text style={[styles.stateTitle, { color: t.text }]}>Estado</Text>
            <Text style={[styles.stateDesc, { color: t.textMuted }]}>
              {pet.status === "active"
                ? "Activa"
                : "Modo recuerdo"}
            </Text>

            {pet.status === "active" ? (
              <Pressable onPress={confirmMarkDeceased} style={styles.stateAction}>
                <Text style={[styles.stateActionText, { color: t.textMuted }]}>
                  Marcar como fallecido
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={confirmReactivate} style={styles.stateAction}>
                <Text style={[styles.stateActionText, { color: t.textMuted }]}>
                  Reactivar mascota
                </Text>
              </Pressable>
            )}

            <Pressable onPress={confirmDelete} style={[styles.stateAction, { marginTop: 10 }]}>
              <Text style={[styles.deleteText, { color: t.danger }]}>Eliminar ficha</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Footer fijo (no se pisa con la barra de abajo) */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: t.bg,
            paddingBottom: 10 + insets.bottom,
            borderTopColor: t.border,
          },
        ]}
      >
        <Pressable
          disabled={readOnly}
          onPress={save}
          style={[
            styles.saveBtn,
            { backgroundColor: t.accent, opacity: readOnly ? 0.5 : 1 },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>
            {editing ? "Guardar cambios" : "Guardar"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  content: { padding: 20 },

  preview: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  previewText: { marginTop: 8, fontSize: 12, fontWeight: "700" },

  label: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontWeight: "600",
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: "center",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  clearDate: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  clearDateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  row: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  typeLock: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  avatarTile: {
    width: 82,
    height: 82,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLock: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  stateBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  stateTitle: { fontSize: 14, fontWeight: "900" },
  stateDesc: { marginTop: 4, fontSize: 12, fontWeight: "600" },
  stateAction: { marginTop: 12 },
  stateActionText: { fontSize: 12, fontWeight: "800" },
  deleteText: { fontSize: 12, fontWeight: "900" },

  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  saveBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
