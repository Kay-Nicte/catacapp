import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
import type { FirestoreVetVisit } from '../../types/firestore';
import i18n from '../../i18n';

export interface VetVisit {
  id: string;
  petId: string;
  type: 'PAST' | 'UPCOMING';
  date: string;
  veterinarian: string;
  reason: string;
  notes: string;
  notificationId?: string; // local-only, from notificationMap
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

export function VetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const { scheduleVetReminder, cancelNotification } = useNotifications();
  const { pets } = usePet();
  const [visits, setVisits] = useState<VetVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Firestore vet visits
  useEffect(() => {
    if (!user || !householdId || householdLoading) {
      if (!user) {
        setVisits([]);
      }
      setIsLoading(!user ? true : householdLoading);
      return;
    }

    const unsub = onCollectionSnapshot<FirestoreVetVisit>(
      householdId,
      'vetVisits',
      async (items) => {
        // Hydrate with local notification IDs
        const mapped: VetVisit[] = await Promise.all(
          items.map(async (item) => {
            const notifId = await getNotificationId(user.id, item.id);
            return {
              id: item.id,
              petId: item.petId,
              type: item.type,
              date: item.date,
              veterinarian: item.veterinarian,
              reason: item.reason,
              notes: item.notes,
              notificationId: notifId ?? undefined,
            };
          })
        );
        setVisits(mapped);
        setIsLoading(false);
      }
    );

    return unsub;
  }, [user?.id, householdId, householdLoading]);

  const addVisit = async (visit: Omit<VetVisit, 'id'>) => {
    if (!householdId || !user) return;

    const data: FirestoreVetVisit = {
      petId: visit.petId,
      type: visit.type,
      date: visit.date,
      veterinarian: visit.veterinarian,
      reason: visit.reason,
      notes: visit.notes,
    };

    const docId = await addDocument(householdId, 'vetVisits', data);

    // Schedule local notification for upcoming visits
    if (visit.type === 'UPCOMING') {
      const pet = pets.find(p => p.id === visit.petId);
      const petName = pet?.name || i18n.t('common.yourPet');
      const notificationId = await scheduleVetReminder(
        petName,
        visit.veterinarian || i18n.t('common.theVet'),
        new Date(visit.date)
      );
      if (notificationId) {
        await saveNotifId(user.id, docId, notificationId);
      }
    }
  };

  const deleteVisit = async (id: string) => {
    if (!householdId || !user) return;

    // Cancel notification
    const notifId = await getNotificationId(user.id, id);
    if (notifId) {
      await cancelNotification(notifId);
      await removeNotificationId(user.id, id);
    }

    await deleteDocument(householdId, 'vetVisits', id);
  };

  const updateVisit = (id: string, updates: Partial<Omit<VetVisit, 'id'>>) => {
    if (!householdId) return;
    const { notificationId, ...firestoreUpdates } = updates as any;
    updateDocument(householdId, 'vetVisits', id, firestoreUpdates);
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
    if (!householdId) return;
    updateDocument(householdId, 'vetVisits', id, { type: 'PAST' });
  };

  const deleteByPet = async (petId: string) => {
    if (!householdId || !user) return;

    // Cancel notifications for this pet's visits
    const petVisits = visits.filter(v => v.petId === petId);
    for (const v of petVisits) {
      const notifId = await getNotificationId(user.id, v.id);
      if (notifId) {
        await cancelNotification(notifId);
        await removeNotificationId(user.id, v.id);
      }
    }

    await deleteDocumentsWhere(householdId, 'vetVisits', 'petId', petId);
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
