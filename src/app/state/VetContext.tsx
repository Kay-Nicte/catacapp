import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { usePet } from './PetContext';
import i18n from '../../i18n';

export interface VetVisit {
  id: string;
  petId: string;
  type: 'PAST' | 'UPCOMING';
  date: string; // ISO string para serialización
  veterinarian: string;
  reason: string;
  notes: string;
  notificationId?: string; // ID de la notificación programada
}

interface VetContextType {
  visits: VetVisit[];
  isLoading: boolean;
  addVisit: (visit: Omit<VetVisit, 'id'>) => Promise<void>;
  deleteVisit: (id: string) => Promise<void>;
  updateVisit: (id: string, updates: Partial<Omit<VetVisit, 'id'>>) => void;
  getVisitsByPet: (petId: string) => { past: VetVisit[]; upcoming: VetVisit[] };
  markAsCompleted: (id: string) => void;
  deleteByPet: (petId: string) => Promise<void>;
}

const VetContext = createContext<VetContextType | undefined>(undefined);

const VET_STORAGE_KEY = '@catacapp_vet_visits';

export function VetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { scheduleVetReminder, cancelNotification } = useNotifications();
  const { pets } = usePet();
  const [visits, setVisits] = useState<VetVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${VET_STORAGE_KEY}_${user?.id}`;

  // Cargar datos al iniciar / limpiar al cerrar sesión
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setVisits([]);
      setIsLoading(true);
    }
  }, [user]);

  // Guardar visits cuando cambien
  useEffect(() => {
    if (!isLoading && user) {
      AsyncStorage.setItem(storageKey, JSON.stringify(visits));
    }
  }, [visits, isLoading, user]);

  const loadData = async () => {
    try {
      const storedVisits = await AsyncStorage.getItem(storageKey);
      if (storedVisits) {
        setVisits(JSON.parse(storedVisits));
      }
    } catch (error) {
      console.error('Error loading vet visits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addVisit = async (visit: Omit<VetVisit, 'id'>) => {
    const newVisit: VetVisit = {
      ...visit,
      id: `v_${Date.now()}_${Math.random()}`,
    };

    // Programar notificación para citas futuras
    if (visit.type === 'UPCOMING') {
      const pet = pets.find(p => p.id === visit.petId);
      const petName = pet?.name || i18n.t('common.yourPet');
      const notificationId = await scheduleVetReminder(
        petName,
        visit.veterinarian || i18n.t('common.theVet'),
        new Date(visit.date)
      );
      if (notificationId) {
        newVisit.notificationId = notificationId;
      }
    }

    setVisits(prev => [newVisit, ...prev]);
  };

  const deleteVisit = async (id: string) => {
    const visit = visits.find(v => v.id === id);
    if (visit?.notificationId) {
      await cancelNotification(visit.notificationId);
    }
    setVisits(prev => prev.filter(v => v.id !== id));
  };

  const updateVisit = (id: string, updates: Partial<Omit<VetVisit, 'id'>>) => {
    setVisits(prev =>
      prev.map(v => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const getVisitsByPet = (petId: string) => {
    const petVisits = visits.filter(v => v.petId === petId);
    const now = new Date();

    const past = petVisits
      .filter(v => v.type === 'PAST' || new Date(v.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const upcoming = petVisits
      .filter(v => v.type === 'UPCOMING' && new Date(v.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { past, upcoming };
  };

  const markAsCompleted = (id: string) => {
    setVisits(prev =>
      prev.map(v =>
        v.id === id ? { ...v, type: 'PAST' as const } : v
      )
    );
  };

  const deleteByPet = async (petId: string) => {
    const petVisits = visits.filter(v => v.petId === petId);
    for (const v of petVisits) {
      if (v.notificationId) {
        await cancelNotification(v.notificationId);
      }
    }
    setVisits(prev => prev.filter(v => v.petId !== petId));
  };

  return (
    <VetContext.Provider
      value={{
        visits,
        isLoading,
        addVisit,
        deleteVisit,
        updateVisit,
        getVisitsByPet,
        markAsCompleted,
        deleteByPet,
      }}
    >
      {children}
    </VetContext.Provider>
  );
}

export function useVet() {
  const context = useContext(VetContext);
  if (!context) {
    throw new Error('useVet must be used within VetProvider');
  }
  return context;
}
