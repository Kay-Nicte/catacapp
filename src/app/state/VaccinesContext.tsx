import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface Vaccine {
  id: string;
  petId: string;
  name: string;
  date: string; // ISO string
  nextDose?: string; // ISO string opcional
  notes?: string;
}

interface VaccinesContextType {
  vaccines: Vaccine[];
  isLoading: boolean;
  addVaccine: (vaccine: Omit<Vaccine, 'id'>) => void;
  updateVaccine: (id: string, updates: Partial<Omit<Vaccine, 'id'>>) => void;
  deleteVaccine: (id: string) => void;
  getVaccinesByPet: (petId: string) => Vaccine[];
}

const VaccinesContext = createContext<VaccinesContextType | undefined>(undefined);

const VACCINES_STORAGE_KEY = '@catacapp_vaccines';

export function VaccinesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${VACCINES_STORAGE_KEY}_${user?.id}`;

  // Cargar datos al iniciar
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Guardar vaccines cuando cambien
  useEffect(() => {
    if (!isLoading && user) {
      AsyncStorage.setItem(storageKey, JSON.stringify(vaccines));
    }
  }, [vaccines, isLoading, user]);

  const loadData = async () => {
    try {
      const storedVaccines = await AsyncStorage.getItem(storageKey);
      if (storedVaccines) {
        setVaccines(JSON.parse(storedVaccines));
      }
    } catch (error) {
      console.error('Error loading vaccines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addVaccine = (vaccine: Omit<Vaccine, 'id'>) => {
    const newVaccine: Vaccine = {
      ...vaccine,
      id: `vac_${Date.now()}_${Math.random()}`,
    };
    setVaccines(prev => [newVaccine, ...prev]);
  };

  const updateVaccine = (id: string, updates: Partial<Omit<Vaccine, 'id'>>) => {
    setVaccines(prev =>
      prev.map(v => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const deleteVaccine = (id: string) => {
    setVaccines(prev => prev.filter(v => v.id !== id));
  };

  const getVaccinesByPet = (petId: string) => {
    return vaccines.filter(v => v.petId === petId);
  };

  return (
    <VaccinesContext.Provider
      value={{
        vaccines,
        isLoading,
        addVaccine,
        updateVaccine,
        deleteVaccine,
        getVaccinesByPet,
      }}
    >
      {children}
    </VaccinesContext.Provider>
  );
}

export function useVaccines() {
  const context = useContext(VaccinesContext);
  if (!context) {
    throw new Error('useVaccines must be used within VaccinesProvider');
  }
  return context;
}
