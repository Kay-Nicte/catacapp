import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { useNotifications } from './NotificationContext';
import { usePet } from './PetContext';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  onCollectionSnapshot,
  deleteDocumentsWhere,
} from '../../services/firestore';
import {
  getNotificationId,
  setNotificationId as saveNotifId,
  removeNotificationId,
} from '../../services/notificationMap';
import type { FirestoreVaccine } from '../../types/firestore';
import i18n from '../../i18n';

export interface Vaccine {
  id: string;
  petId: string;
  name: string;
  date: string;
  nextDose?: string;
  notes?: string;
  notificationId?: string; // local-only, from notificationMap
}

interface VaccinesContextType {
  vaccines: Vaccine[];
  isLoading: boolean;
  addVaccine: (vaccine: Omit<Vaccine, 'id' | 'notificationId'>) => Promise<void>;
  updateVaccine: (id: string, updates: Partial<Omit<Vaccine, 'id' | 'notificationId'>>) => Promise<void>;
  deleteVaccine: (id: string) => Promise<void>;
  getVaccinesByPet: (petId: string) => Vaccine[];
  deleteByPet: (petId: string) => Promise<void>;
  refreshVaccines: () => void;
}

const VaccinesContext = createContext<VaccinesContextType | undefined>(undefined);

export function VaccinesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const { scheduleVaccineReminder, cancelNotification } = useNotifications();
  const { pets } = usePet();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subVersion, setSubVersion] = useState(0);
  const notifMapLoaded = useRef(false);

  // Subscribe to Firestore vaccines
  useEffect(() => {
    if (!user || !householdId || householdLoading) {
      if (!user) {
        setVaccines([]);
      }
      setIsLoading(!user ? true : householdLoading);
      return;
    }

    const unsub = onCollectionSnapshot<FirestoreVaccine>(
      householdId,
      'vaccines',
      async (items) => {
        // Hydrate with local notification IDs
        const mapped: Vaccine[] = await Promise.all(
          items.map(async (item) => {
            const notifId = await getNotificationId(user.id, item.id);
            return {
              id: item.id,
              petId: item.petId,
              name: item.name,
              date: item.date,
              nextDose: item.nextDose,
              notes: item.notes,
              notificationId: notifId ?? undefined,
            };
          })
        );
        setVaccines(mapped);
        setIsLoading(false);
      }
    );

    return unsub;
  }, [user?.id, householdId, householdLoading, subVersion]);

  const addVaccine = async (vaccine: Omit<Vaccine, 'id' | 'notificationId'>) => {
    if (!householdId || !user) {
      Alert.alert('Error', 'No se pudo guardar. Reinicia la app e inténtalo de nuevo.');
      return;
    }

    try {
      const data: FirestoreVaccine = {
        petId: vaccine.petId,
        name: vaccine.name,
        date: vaccine.date,
      };
      if (vaccine.nextDose !== undefined) data.nextDose = vaccine.nextDose;
      if (vaccine.notes !== undefined) data.notes = vaccine.notes;

      const docId = await addDocument(householdId, 'vaccines', data);

      // Schedule local notification
      if (vaccine.nextDose) {
        const pet = pets.find(p => p.id === vaccine.petId);
        const petName = pet?.name || i18n.t('common.yourPet');
        const notificationId = await scheduleVaccineReminder(
          petName,
          vaccine.name,
          new Date(vaccine.nextDose)
        );
        if (notificationId) {
          await saveNotifId(user.id, docId, notificationId);
        }
      }
    } catch (error) {
      console.error('Error adding vaccine:', error);
      Alert.alert('Error', 'No se pudo guardar la vacuna.');
    }
  };

  const updateVaccine = async (id: string, updates: Partial<Omit<Vaccine, 'id' | 'notificationId'>>) => {
    if (!householdId || !user) return;

    const existing = vaccines.find(v => v.id === id);
    if (!existing) return;

    // Update Firestore (exclude notificationId)
    const { ...firestoreUpdates } = updates;
    await updateDocument(householdId, 'vaccines', id, firestoreUpdates);

    // Handle notification rescheduling
    if ('nextDose' in updates) {
      // Cancel old notification
      const oldNotifId = await getNotificationId(user.id, id);
      if (oldNotifId) {
        await cancelNotification(oldNotifId);
        await removeNotificationId(user.id, id);
      }

      // Schedule new notification
      if (updates.nextDose) {
        const pet = pets.find(p => p.id === (updates.petId || existing.petId));
        const petName = pet?.name || i18n.t('common.yourPet');
        const vaccineName = updates.name || existing.name;
        const notifId = await scheduleVaccineReminder(
          petName,
          vaccineName,
          new Date(updates.nextDose)
        );
        if (notifId) {
          await saveNotifId(user.id, id, notifId);
        }
      }
    }
  };

  const deleteVaccine = async (id: string) => {
    if (!householdId || !user) return;

    // Cancel notification
    const notifId = await getNotificationId(user.id, id);
    if (notifId) {
      await cancelNotification(notifId);
      await removeNotificationId(user.id, id);
    }

    await deleteDocument(householdId, 'vaccines', id);
  };

  const getVaccinesByPet = (petId: string) => {
    return vaccines.filter(v => v.petId === petId);
  };

  const refreshVaccines = useCallback(() => {
    setSubVersion((v) => v + 1);
  }, []);

  const deleteByPet = async (petId: string) => {
    if (!householdId || !user) return;

    // Cancel all notifications for this pet's vaccines
    const petVaccines = vaccines.filter(v => v.petId === petId);
    for (const v of petVaccines) {
      const notifId = await getNotificationId(user.id, v.id);
      if (notifId) {
        await cancelNotification(notifId);
        await removeNotificationId(user.id, v.id);
      }
    }

    await deleteDocumentsWhere(householdId, 'vaccines', 'petId', petId);
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
        refreshVaccines,
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
