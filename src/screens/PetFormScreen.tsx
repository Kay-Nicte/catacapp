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
import { useToast } from "../components/ui/Toast";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from 'react-i18next';
import { useTheme } from "../theme/useTheme";
import { usePet } from "../app/state/PetContext";
import { useRecords } from "../app/state/RecordsContext";
import { useVet } from "../app/state/VetContext";
import { useVaccines } from "../app/state/VaccinesContext";
import { usePremium, FREE_LIMITS } from "../app/state/PremiumContext";
import PetAvatar from "../components/PetAvatar";
import { premiumAvatars, premiumPetTypes } from "../assets/avatars";
import { Icon } from "../components/ui/Icon";
import { useRoute, useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/layout/ScreenContainer";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../app/navigation/AppStack";
import { formatDatePadded } from "../utils/format";

import { fonts } from '../theme/fonts';
export default function PetFormScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PetForm">>();

  const {
    pets, addPet, updatePet, markPetDeceased, reactivatePet, deletePet,
    archivePet, unarchivePet, defaultPetId, setDefaultPetId, clearDefaultPetId,
  } = usePet();
  const { isPremium } = usePremium();
  const { deleteByPet: deleteRecordsByPet } = useRecords();
  const { deleteByPet: deleteVetByPet } = useVet();
  const { deleteByPet: deleteVaccinesByPet } = useVaccines();

  const petId = route.params?.petId;
  const editing = Boolean(petId);
  const pet = pets.find((p) => p.id === petId);

  const isMemorial = pet?.status === "memorial";
  const isArchived = pet?.status === "archived";
  const readOnly = isMemorial || isArchived;
  const isDefault = petId ? defaultPetId === petId : false;

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
      showToast(tr('pets.missingName'), tr('pets.missingNameMsg'), 'error');
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
        tr('pets.limitReached'),
        tr('pets.limitReachedMsg', { max: FREE_LIMITS.maxPets }),
        [
          { text: tr('common.cancel'), style: "cancel" },
          { text: tr('pets.viewPremium'), onPress: () => (nav as any).navigate("Premium") },
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
      tr('pets.confirmDeceased'),
      tr('pets.confirmDeceasedMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('pets.confirmMark'),
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
      tr('pets.confirmReactivate'),
      tr('pets.confirmReactivateMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('pets.confirmReactivateBtn'),
          onPress: () => {
            reactivatePet(petId);
            nav.goBack();
          },
        },
      ]
    );
  }

  function confirmArchive() {
    if (!editing || !petId) return;

    Alert.alert(
      tr('pets.confirmArchive'),
      tr('pets.confirmArchiveMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('pets.confirmArchiveBtn'),
          onPress: () => {
            archivePet(petId);
            nav.goBack();
          },
        },
      ]
    );
  }

  function confirmDelete() {
    if (!editing || !petId) return;

    Alert.alert(
      tr('pets.confirmDelete'),
      tr('pets.confirmDeleteMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('common.delete'),
          style: "destructive",
          onPress: async () => {
            await deleteVaccinesByPet(petId);
            await deleteVetByPet(petId);
            deleteRecordsByPet(petId);
            deletePet(petId);
            nav.goBack();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={["bottom"]}>
      <ScreenContainer>
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
          <PetAvatar avatarKey={avatarKey} memorial={isMemorial || isArchived} size={110} />
          <Text style={[styles.previewText, { color: t.textMuted }]}>
            {isArchived ? tr('pets.archivedMode') : isMemorial ? tr('pets.memorialMode') : tr('pets.preview')}
          </Text>
        </View>

        {/* Nombre */}
        <Text style={[styles.label, { color: t.textMuted }]}>{tr('pets.nameLabel')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={!readOnly}
          placeholder={tr('pets.namePlaceholder')}
          placeholderTextColor={t.textMuted}
          style={[
            styles.input,
            { borderColor: t.border, color: t.text, opacity: readOnly ? 0.5 : 1 },
          ]}
        />

        {/* Fecha de nacimiento */}
        <Text style={[styles.label, { color: t.textMuted }]}>{tr('pets.birthDateLabel')}</Text>
        <Pressable
          onPress={() => !readOnly && setShowDatePicker(true)}
          style={[
            styles.dateButton,
            { borderColor: t.border, opacity: readOnly ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.dateText, { color: birthDate ? t.text : t.textMuted }]}>
            {birthDate ? formatDatePadded(birthDate) : tr('pets.selectDate')}
          </Text>
        </Pressable>
        {birthDate && !readOnly && (
          <Pressable onPress={() => setBirthDate(null)} style={styles.clearDate}>
            <Text style={[styles.clearDateText, { color: t.textMuted }]}>{tr('pets.clearDate')}</Text>
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
            <Text style={[styles.doneButtonText, { color: t.accent }]}>{tr('common.done')}</Text>
          </Pressable>
        )}

        {/* Tipo */}
        <Text style={[styles.label, { color: t.textMuted }]}>{tr('pets.typeLabel')}</Text>
        <View style={styles.typeGrid}>
          {[
            { key: "cat", label: tr('pets.type.cat'), defaultAvatar: "cat_gray_01" },
            { key: "dog", label: tr('pets.type.dog'), defaultAvatar: "dog_yellow_01" },
            { key: "rabbit", label: tr('pets.type.rabbit'), defaultAvatar: "rabbit_white" },
            { key: "hamster", label: tr('pets.type.hamster'), defaultAvatar: "hamster_golden" },
            { key: "bird", label: tr('pets.type.bird'), defaultAvatar: "bird_canary" },
            { key: "iguana", label: tr('pets.type.iguana'), defaultAvatar: "iguana_green" },
            { key: "snake", label: tr('pets.type.snake'), defaultAvatar: "snake_python" },
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
                      tr('pets.premiumType'),
                      tr('pets.premiumTypeMsg'),
                      [
                        { text: tr('common.cancel'), style: "cancel" },
                        { text: tr('pets.viewPremium'), onPress: () => (nav as any).navigate("Premium") },
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
                <Text style={{ color: isSelected ? t.accent : t.textMuted, fontFamily: fonts.extraBold, fontSize: 12 }}>
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
        <Text style={[styles.label, { color: t.textMuted }]}>{tr('pets.avatarLabel')}</Text>
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
                      tr('pets.premiumAvatar'),
                      tr('pets.premiumAvatarMsg'),
                      [
                        { text: tr('common.cancel'), style: "cancel" },
                        { text: tr('pets.viewPremium'), onPress: () => (nav as any).navigate("Premium") },
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
            <Text style={[styles.stateTitle, { color: t.text }]}>{tr('pets.stateLabel')}</Text>
            <Text style={[styles.stateDesc, { color: t.textMuted }]}>
              {pet.status === "archived"
                ? tr('pets.archivedMode')
                : pet.status === "memorial"
                  ? tr('pets.memorialMode')
                  : tr('pets.active')}
            </Text>

            {/* Default pet toggle (active only) */}
            {pet.status === "active" && (
              <Pressable
                onPress={() => {
                  if (isDefault) {
                    clearDefaultPetId();
                  } else {
                    setDefaultPetId(petId!);
                  }
                }}
                style={styles.stateAction}
              >
                <Text style={[styles.stateActionText, { color: t.accent }]}>
                  {isDefault ? tr('pets.removeDefault') : tr('pets.setDefault')}
                </Text>
              </Pressable>
            )}

            {/* Status transitions */}
            {pet.status === "active" && (
              <Pressable onPress={confirmMarkDeceased} style={styles.stateAction}>
                <Text style={[styles.stateActionText, { color: t.textMuted }]}>
                  {tr('pets.markDeceased')}
                </Text>
              </Pressable>
            )}
            {pet.status === "memorial" && (
              <>
                <Pressable onPress={confirmReactivate} style={styles.stateAction}>
                  <Text style={[styles.stateActionText, { color: t.textMuted }]}>
                    {tr('pets.reactivate')}
                  </Text>
                </Pressable>
                <Pressable onPress={confirmArchive} style={styles.stateAction}>
                  <Text style={[styles.stateActionText, { color: t.textMuted }]}>
                    {tr('pets.archivePet')}
                  </Text>
                </Pressable>
              </>
            )}
            {pet.status === "archived" && (
              <Pressable
                onPress={() => { unarchivePet(petId!); nav.goBack(); }}
                style={styles.stateAction}
              >
                <Text style={[styles.stateActionText, { color: t.textMuted }]}>
                  {tr('pets.unarchive')}
                </Text>
              </Pressable>
            )}

            <Pressable onPress={confirmDelete} style={[styles.stateAction, { marginTop: 10 }]}>
              <Text style={[styles.deleteText, { color: t.danger }]}>{tr('pets.deletePet')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      </ScreenContainer>

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
          <Text style={{ color: "#fff", fontFamily: fonts.black }}>
            {editing ? tr('pets.saveChanges') : tr('common.save')}
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
  previewText: { marginTop: 8, fontSize: 12, fontFamily: fonts.bold },

  label: {
    fontSize: 12,
    fontFamily: fonts.black,
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
    fontFamily: fonts.semiBold,
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
    fontFamily: fonts.semiBold,
  },
  clearDate: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  clearDateText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
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
  stateTitle: { fontSize: 14, fontFamily: fonts.black },
  stateDesc: { marginTop: 4, fontSize: 12, fontFamily: fonts.semiBold },
  stateAction: { marginTop: 12 },
  stateActionText: { fontSize: 12, fontFamily: fonts.extraBold },
  deleteText: { fontSize: 12, fontFamily: fonts.black },

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
