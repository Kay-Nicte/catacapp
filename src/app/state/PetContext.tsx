import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

export type PetType = "cat" | "dog" | "rabbit" | "hamster" | "bird" | "iguana" | "snake";
export type PetStatus = "active" | "memorial";

export type Pet = {
  id: string;
  name: string;
  type: PetType;
  status: PetStatus;
  avatarKey: string;
  birthDate?: string; // ISO string opcional
  deceasedAt?: string; // ISO string opcional
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

  deletePet: (id: string) => void;
};

const PetContext = createContext<PetContextValue | null>(null);

const PETS_STORAGE_KEY = "@catacapp_pets";
const SELECTED_PET_KEY = "@catacapp_selected_pet";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function PetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${PETS_STORAGE_KEY}_${user?.id}`;
  const selectedKey = `${SELECTED_PET_KEY}_${user?.id}`;

  // Cargar datos al iniciar / limpiar al cerrar sesión
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setPets([]);
      setSelectedPetId("");
      setIsLoading(true);
    }
  }, [user]);

  // Guardar pets cuando cambien
  useEffect(() => {
    if (!isLoading && user) {
      savePets();
    }
  }, [pets, isLoading, user]);

  // Guardar selectedPetId cuando cambie
  useEffect(() => {
    if (!isLoading && user && selectedPetId) {
      AsyncStorage.setItem(selectedKey, selectedPetId);
    }
  }, [selectedPetId, isLoading, user]);

  const loadData = async () => {
    try {
      const [storedPets, storedSelected] = await Promise.all([
        AsyncStorage.getItem(storageKey),
        AsyncStorage.getItem(selectedKey),
      ]);

      if (storedPets) {
        const parsedPets: Pet[] = JSON.parse(storedPets);
        setPets(parsedPets);

        if (storedSelected && parsedPets.some(p => p.id === storedSelected)) {
          setSelectedPetId(storedSelected);
        } else if (parsedPets.length > 0) {
          setSelectedPetId(parsedPets[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading pets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePets = async () => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(pets));
    } catch (error) {
      console.error("Error saving pets:", error);
    }
  };

  const selectedPet = useMemo(() => {
    return pets.find((p) => p.id === selectedPetId) ?? pets[0];
  }, [pets, selectedPetId]);

  const addPet = useCallback((input: PetUpsertInput) => {
    const id = uid();
    const next: Pet = {
      id,
      name: input.name,
      type: input.type,
      avatarKey: input.avatarKey,
      birthDate: input.birthDate,
      status: "active",
    };
    setPets((prev) => [next, ...prev]);
    setSelectedPetId(id);
    return id;
  }, []);

  const updatePet = useCallback((id: string, input: PetUpsertInput) => {
    setPets((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, name: input.name, type: input.type, avatarKey: input.avatarKey, birthDate: input.birthDate }
          : p
      )
    );
  }, []);

  const markPetDeceased = useCallback((id: string, deceasedAtISO: string) => {
    setPets((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "memorial" as PetStatus, deceasedAt: deceasedAtISO }
          : p
      )
    );
  }, []);

  const reactivatePet = useCallback((id: string) => {
    setPets((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "active" as PetStatus, deceasedAt: undefined }
          : p
      )
    );
  }, []);

  const deletePet = useCallback((id: string) => {
    setPets((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      // Actualizar selectedPetId si se eliminó la mascota seleccionada
      if (selectedPetId === id && remaining.length > 0) {
        setSelectedPetId(remaining[0].id);
      } else if (remaining.length === 0) {
        setSelectedPetId("");
      }
      return remaining;
    });
  }, [selectedPetId]);

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
      deletePet,
    }),
    [pets, selectedPetId, selectedPet, isLoading, addPet, updatePet, markPetDeceased, reactivatePet, deletePet]
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error("usePet must be used within PetProvider");
  return ctx;
}
