import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { useHousehold } from "./HouseholdContext";
import {
  addDocument,
  updateDocument,
  deleteDocument,
  onCollectionSnapshot,
} from "../../services/firestore";
import type { FirestorePet } from "../../types/firestore";

export type PetType = "cat" | "dog" | "rabbit" | "hamster" | "bird" | "iguana" | "snake";
export type PetStatus = "active" | "memorial" | "archived";

export type Pet = {
  id: string;
  name: string;
  type: PetType;
  status: PetStatus;
  avatarKey: string;
  birthDate?: string;
  deceasedAt?: string;
};

type PetUpsertInput = {
  id?: string;
  name: string;
  type: PetType;
  avatarKey: string;
  birthDate?: string;
};

type PetContextValue = {
  pets: Pet[];
  selectedPetId: string;
  selectedPet: Pet | undefined;
  setSelectedPetId: (id: string) => void;
  isLoading: boolean;

  addPet: (input: PetUpsertInput) => string;
  updatePet: (id: string, input: PetUpsertInput) => void;

  markPetDeceased: (id: string, deceasedAtISO: string) => void;
  reactivatePet: (id: string) => void;
  archivePet: (id: string) => void;
  unarchivePet: (id: string) => void;

  defaultPetId: string;
  setDefaultPetId: (id: string) => void;
  clearDefaultPetId: () => void;

  deletePet: (id: string) => void;
  refreshPets: () => void;
};

const PetContext = createContext<PetContextValue | null>(null);

const SELECTED_PET_KEY = "@catacapp_selected_pet";
const DEFAULT_PET_KEY = "@catacapp_default_pet";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function PetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [defaultPetId, setDefaultPetIdState] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [subVersion, setSubVersion] = useState(0);

  const selectedKey = `${SELECTED_PET_KEY}_${user?.id}`;
  const defaultKey = `${DEFAULT_PET_KEY}_${user?.id}`;

  // Subscribe to Firestore pets collection
  useEffect(() => {
    if (!user || !householdId || householdLoading) {
      if (!user) {
        setPets([]);
        setSelectedPetId("");
        setDefaultPetIdState("");
      }
      setIsLoading(!user ? true : householdLoading);
      return;
    }

    // Load saved selected pet and default pet
    Promise.all([
      AsyncStorage.getItem(selectedKey),
      AsyncStorage.getItem(defaultKey),
    ]).then(([storedSelected, storedDefault]) => {
      if (storedSelected) setSelectedPetId(storedSelected);
      if (storedDefault) setDefaultPetIdState(storedDefault);
    });

    const unsub = onCollectionSnapshot<FirestorePet>(
      householdId,
      'pets',
      (items) => {
        const mapped: Pet[] = items.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          status: item.status,
          avatarKey: item.avatarKey,
          birthDate: item.birthDate,
          deceasedAt: item.deceasedAt,
        }));
        setPets(mapped);
        setIsLoading(false);

        // Auto-select: defaultPetId > last selected > first non-archived pet
        if (mapped.length > 0) {
          setSelectedPetId((prev) => {
            if (prev && mapped.some((p) => p.id === prev && p.status !== "archived")) {
              return prev;
            }
            // Try default pet
            AsyncStorage.getItem(`${DEFAULT_PET_KEY}_${user?.id}`).then((defId) => {
              if (defId && mapped.some((p) => p.id === defId && p.status !== "archived")) {
                setSelectedPetId(defId);
              }
            });
            const firstNonArchived = mapped.find((p) => p.status !== "archived");
            return firstNonArchived ? firstNonArchived.id : mapped[0].id;
          });
        } else {
          setSelectedPetId("");
        }
      }
    );

    return unsub;
  }, [user?.id, householdId, householdLoading, subVersion]);

  // Persist selected pet locally
  useEffect(() => {
    if (!isLoading && user && selectedPetId) {
      AsyncStorage.setItem(selectedKey, selectedPetId);
    }
  }, [selectedPetId, isLoading, user]);

  const selectedPet = useMemo(() => {
    return pets.find((p) => p.id === selectedPetId) ?? pets[0];
  }, [pets, selectedPetId]);

  const addPet = useCallback((input: PetUpsertInput) => {
    if (!householdId) return "";

    const id = uid();
    const data: FirestorePet = {
      name: input.name,
      type: input.type,
      avatarKey: input.avatarKey,
      birthDate: input.birthDate,
      status: "active",
    };

    // Optimistic update
    setPets((prev) => [{ id, ...data }, ...prev]);
    setSelectedPetId(id);

    // Write to Firestore (use generated id as doc id)
    addDocument(householdId, 'pets', data).then((firestoreId) => {
      // If Firestore assigned a different ID, update local state
      if (firestoreId !== id) {
        setPets((prev) =>
          prev.map((p) => (p.id === id ? { ...p, id: firestoreId } : p))
        );
        setSelectedPetId(firestoreId);
      }
    });

    return id;
  }, [householdId]);

  const updatePet = useCallback((id: string, input: PetUpsertInput) => {
    if (!householdId) return;

    const updates: Partial<FirestorePet> = {
      name: input.name,
      type: input.type,
      avatarKey: input.avatarKey,
      birthDate: input.birthDate,
    };

    updateDocument(householdId, 'pets', id, updates);
  }, [householdId]);

  const markPetDeceased = useCallback((id: string, deceasedAtISO: string) => {
    if (!householdId) return;
    updateDocument(householdId, 'pets', id, {
      status: "memorial",
      deceasedAt: deceasedAtISO,
    });
  }, [householdId]);

  const reactivatePet = useCallback((id: string) => {
    if (!householdId) return;
    updateDocument(householdId, 'pets', id, {
      status: "active",
      deceasedAt: null,
    });
  }, [householdId]);

  const archivePet = useCallback((id: string) => {
    if (!householdId) return;
    updateDocument(householdId, 'pets', id, { status: "archived" });
  }, [householdId]);

  const unarchivePet = useCallback((id: string) => {
    if (!householdId) return;
    // Unarchive back to memorial (archived pets come from memorial)
    updateDocument(householdId, 'pets', id, { status: "memorial" });
  }, [householdId]);

  const setDefaultPetId = useCallback((id: string) => {
    setDefaultPetIdState(id);
    if (user) AsyncStorage.setItem(defaultKey, id);
  }, [user, defaultKey]);

  const clearDefaultPetId = useCallback(() => {
    setDefaultPetIdState("");
    if (user) AsyncStorage.removeItem(defaultKey);
  }, [user, defaultKey]);

  const deletePet = useCallback((id: string) => {
    if (!householdId) return;
    deleteDocument(householdId, 'pets', id);
  }, [householdId]);

  const refreshPets = useCallback(() => {
    setSubVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({
      pets,
      selectedPetId,
      selectedPet,
      setSelectedPetId,
      isLoading,
      addPet,
      updatePet,
      markPetDeceased,
      reactivatePet,
      archivePet,
      unarchivePet,
      defaultPetId,
      setDefaultPetId,
      clearDefaultPetId,
      deletePet,
      refreshPets,
    }),
    [pets, selectedPetId, selectedPet, isLoading, addPet, updatePet, markPetDeceased, reactivatePet, archivePet, unarchivePet, defaultPetId, setDefaultPetId, clearDefaultPetId, deletePet, refreshPets]
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error("usePet must be used within PetProvider");
  return ctx;
}
