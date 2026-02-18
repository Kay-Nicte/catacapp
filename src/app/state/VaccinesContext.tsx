import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { usePet } from './PetContext';

export interface Vaccine {
  id: string;
  petId: string;
  name: string;
  date: string; // ISO string
  nextDose?: string; // ISO string opcional
  notes?: string;
  notificationId?: string; // ID de la notificación programada
}

interface VaccinesContextType {
  vaccines: Vaccine[];
  isLoading: boolean;
  addVaccine: (vaccine: Omit<Vaccine, 'id' | 'notificationId'>) => Promise<void>;
  updateVaccine: (id: string, updates: Partial<Omit<Vaccine, 'id' | 'notificationId'>>) => Promise<void>;
  deleteVaccine: (id: string) => Promise<void>;
  getVaccinesByPet: (petId: string) => Vaccine[];
  deleteByPet: (petId: string) => Promise<void>;
}

const VaccinesContext = createContext<VaccinesContextType | undefined>(undefined);

const VACCINES_STORAGE_KEY = '@catacapp_vaccines';

export function VaccinesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { scheduleVaccineReminder, cancelNotification } = useNotifications();
  const { pets } = usePet();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${VACCINES_STORAGE_KEY}_${user?.id}`;

  // Cargar datos al iniciar / limpiar al cerrar sesión
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setVaccines([]);
      setIsLoading(true);
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

  const addVaccine = async (vaccine: Omit<Vaccine, 'id' | 'notificationId'>) => {
    const newVaccine: Vaccine = {
      ...vaccine,
      id: `vac_${Date.now()}_${Math.random()}`,
    };

    // Programar notificación si hay próxima dosis
    if (vaccine.nextDose) {
      const pet = pets.find(p => p.id === vaccine.petId);
      const petName = pet?.name || 'Tu mascota';
      const notificationId = await scheduleVaccineReminder(
        petName,
        vaccine.name,
        new Date(vaccine.nextDose)
      );
      if (notificationId) {
        newVaccine.notificationId = notificationId;
      }
    }

    setVaccines(prev => [newVaccine, ...prev]);
  };

  const updateVaccine = async (id: string, updates: Partial<Omit<Vaccine, 'id' | 'notificationId'>>) => {
    const existing = vaccines.find(v => v.id === id);
    if (!existing) return;

    let newNotificationId = existing.notificationId;

    // Si cambia nextDose, reprogramar notificación
    if ('nextDose' in updates) {
      // Cancelar notificación anterior
      if (existing.notificationId) {
        await cancelNotification(existing.notificationId);
        newNotificationId = undefined;
      }

      // Programar nueva si hay próxima dosis
      if (updates.nextDose) {
        const pet = pets.find(p => p.id === (updates.petId || existing.petId));
        const petName = pet?.name || 'Tu mascota';
        const vaccineName = updates.name || existing.name;
        const notifId = await scheduleVaccineReminder(
          petName,
          vaccineName,
          new Date(updates.nextDose)
        );
        if (notifId) {
          newNotificationId = notifId;
        }
      }
    }

    setVaccines(prev =>
      prev.map(v => (v.id === id ? { ...v, ...updates, notificationId: newNotificationId } : v))
    );
  };

  const deleteVaccine = async (id: string) => {
    const vaccine = vaccines.find(v => v.id === id);
    if (vaccine?.notificationId) {
      await cancelNotification(vaccine.notificationId);
    }
    setVaccines(prev => prev.filter(v => v.id !== id));
  };

  const getVaccinesByPet = (petId: string) => {
    return vaccines.filter(v => v.petId === petId);
  };

  const deleteByPet = async (petId: string) => {
    const petVaccines = vaccines.filter(v => v.petId === petId);
    for (const v of petVaccines) {
      if (v.notificationId) {
        await cancelNotification(v.notificationId);
      }
    }
    setVaccines(prev => prev.filter(v => v.petId !== petId));
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
        deleteByPet,
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
