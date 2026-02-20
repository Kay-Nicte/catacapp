import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  onCollectionSnapshot,
  deleteDocumentsWhere,
} from '../../services/firestore';
import type { FirestoreRecord, FirestoreRoutine } from '../../types/firestore';

export type RecordType = 'FOOD' | 'POOP' | 'SLEEP' | 'WEIGHT' | 'NOTE';

export interface Record {
  id: string;
  petId: string;
  type: RecordType;
  title: string;
  value: string;
  timestamp: string;
  source: 'MANUAL' | 'ROUTINE';
  routineId?: string;
  customTime?: string;
}

export interface Routine {
  id: string;
  petId: string;
  type: RecordType;
  title: string;
  time: string;
  defaultValue?: string;
  active: boolean;
  days?: number[];
}

export interface SuggestedRoutine extends Routine {
  status: 'PENDING' | 'DONE' | 'SKIPPED';
  actualValue?: string;
}

interface RecordsContextType {
  records: Record[];
  routines: Routine[];
  isLoading: boolean;
  addRecord: (record: Omit<Record, 'id' | 'timestamp'>) => void;
  deleteRecord: (id: string) => void;
  updateRecord: (id: string, updates: Partial<Omit<Record, 'id' | 'timestamp'>>) => void;
  getRecordsByDate: (date: Date, petId: string) => Record[];
  getRecordsByPet: (petId: string) => Record[];
  getTodayRoutines: (petId: string) => SuggestedRoutine[];
  confirmRoutine: (routineId: string, petId: string, data: { value: string; time: string }) => void;
  skipRoutine: (routineId: string) => void;
  addRoutine: (routine: Omit<Routine, 'id'>) => void;
  deleteRoutine: (id: string) => void;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteByPet: (petId: string) => void;
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

const ROUTINE_STATUS_KEY = '@catacapp_routine_status';

export function RecordsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const [records, setRecords] = useState<Record[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [dailyRoutineStatus, setDailyRoutineStatus] = useState<Map<string, 'PENDING' | 'DONE' | 'SKIPPED'>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const statusKey = `${ROUTINE_STATUS_KEY}_${user?.id}`;
  const lastDateRef = useRef<string>(new Date().toDateString());
  const recordsLoaded = useRef(false);
  const routinesLoaded = useRef(false);

  // Reset routine status when date changes
  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date().toDateString();
      if (today !== lastDateRef.current) {
        lastDateRef.current = today;
        setDailyRoutineStatus(new Map());
      }
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkDateChange();
    });

    const interval = setInterval(checkDateChange, 60_000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  // Subscribe to Firestore records & routines
  useEffect(() => {
    if (!user || !householdId || householdLoading) {
      if (!user) {
        setRecords([]);
        setRoutines([]);
        setDailyRoutineStatus(new Map());
      }
      setIsLoading(!user ? true : householdLoading);
      return;
    }

    recordsLoaded.current = false;
    routinesLoaded.current = false;

    // Load routine status from local storage
    AsyncStorage.getItem(statusKey).then((storedStatus) => {
      if (storedStatus) {
        const todaySuffix = `_${new Date().toDateString()}`;
        const allEntries: [string, 'PENDING' | 'DONE' | 'SKIPPED'][] = Object.entries(JSON.parse(storedStatus)) as [string, 'PENDING' | 'DONE' | 'SKIPPED'][];
        const todayEntries = allEntries.filter(([key]) => key.endsWith(todaySuffix));
        setDailyRoutineStatus(new Map(todayEntries));
      }
    });

    const unsubRecords = onCollectionSnapshot<FirestoreRecord>(
      householdId,
      'records',
      (items) => {
        const mapped: Record[] = items.map((item) => ({
          id: item.id,
          petId: item.petId,
          type: item.type,
          title: item.title,
          value: item.value,
          timestamp: item.timestamp,
          source: item.source,
          routineId: item.routineId,
          customTime: item.customTime,
        }));
        setRecords(mapped);
        recordsLoaded.current = true;
        if (routinesLoaded.current) setIsLoading(false);
      }
    );

    const unsubRoutines = onCollectionSnapshot<FirestoreRoutine>(
      householdId,
      'routines',
      (items) => {
        const mapped: Routine[] = items.map((item) => ({
          id: item.id,
          petId: item.petId,
          type: item.type,
          title: item.title,
          time: item.time,
          defaultValue: item.defaultValue,
          active: item.active,
          days: item.days,
        }));
        setRoutines(mapped);
        routinesLoaded.current = true;
        if (recordsLoaded.current) setIsLoading(false);
      }
    );

    return () => {
      unsubRecords();
      unsubRoutines();
    };
  }, [user?.id, householdId, householdLoading]);

  // Persist routine status locally
  useEffect(() => {
    if (!isLoading && user) {
      const statusObj = Object.fromEntries(dailyRoutineStatus);
      AsyncStorage.setItem(statusKey, JSON.stringify(statusObj));
    }
  }, [dailyRoutineStatus, isLoading, user]);

  const addRecord = (record: Omit<Record, 'id' | 'timestamp'>) => {
    if (!householdId) return;

    const data: FirestoreRecord = {
      ...record,
      timestamp: new Date().toISOString(),
    };

    addDocument(householdId, 'records', data);
  };

  const deleteRecord = (id: string) => {
    if (!householdId) return;
    deleteDocument(householdId, 'records', id);
  };

  const updateRecord = (id: string, updates: Partial<Omit<Record, 'id' | 'timestamp'>>) => {
    if (!householdId) return;
    updateDocument(householdId, 'records', id, updates);
  };

  const getRecordsByDate = (date: Date, petId: string): Record[] => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return records.filter(r => {
      const recordDate = new Date(r.timestamp);
      return r.petId === petId && recordDate >= startOfDay && recordDate <= endOfDay;
    });
  };

  const getRecordsByPet = (petId: string): Record[] => {
    return records.filter(r => r.petId === petId);
  };

  const getTodayRoutines = (petId: string): SuggestedRoutine[] => {
    const today = new Date().getDay();
    const activeRoutines = routines.filter(
      r =>
        r.petId === petId &&
        r.active &&
        (!r.days || r.days.length === 0 || r.days.includes(today))
    );

    return activeRoutines.map(routine => {
      const statusKeyStr = `${routine.id}_${new Date().toDateString()}`;
      const status = dailyRoutineStatus.get(statusKeyStr) || 'PENDING';

      const todayRecords = getRecordsByDate(new Date(), petId);
      const routineRecord = todayRecords.find(r => r.routineId === routine.id);

      return {
        ...routine,
        status: routineRecord ? 'DONE' : status,
        actualValue: routineRecord?.value,
      };
    });
  };

  const confirmRoutine = (routineId: string, petId: string, data: { value: string; time: string }) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const statusKeyStr = `${routineId}_${new Date().toDateString()}`;
    setDailyRoutineStatus(prev => new Map(prev).set(statusKeyStr, 'DONE'));

    addRecord({
      petId,
      type: routine.type,
      title: routine.title,
      value: data.value,
      source: 'ROUTINE',
      routineId,
      customTime: data.time,
    });
  };

  const skipRoutine = (routineId: string) => {
    const statusKeyStr = `${routineId}_${new Date().toDateString()}`;
    setDailyRoutineStatus(prev => new Map(prev).set(statusKeyStr, 'SKIPPED'));
  };

  const addRoutine = (routine: Omit<Routine, 'id'>) => {
    if (!householdId) return;

    const data: FirestoreRoutine = {
      petId: routine.petId,
      type: routine.type,
      title: routine.title,
      time: routine.time,
      defaultValue: routine.defaultValue,
      active: routine.active,
      days: routine.days,
    };

    addDocument(householdId, 'routines', data);
  };

  const deleteRoutine = (id: string) => {
    if (!householdId) return;
    deleteDocument(householdId, 'routines', id);
  };

  const updateRoutine = (id: string, updates: Partial<Routine>) => {
    if (!householdId) return;
    const { id: _id, ...data } = updates as any;
    updateDocument(householdId, 'routines', id, data);
  };

  const deleteByPet = (petId: string) => {
    if (!householdId) return;
    deleteDocumentsWhere(householdId, 'records', 'petId', petId);
    deleteDocumentsWhere(householdId, 'routines', 'petId', petId);
  };

  return (
    <RecordsContext.Provider
      value={{
        records,
        routines,
        isLoading,
        addRecord,
        deleteRecord,
        updateRecord,
        getRecordsByDate,
        getRecordsByPet,
        getTodayRoutines,
        confirmRoutine,
        skipRoutine,
        addRoutine,
        deleteRoutine,
        updateRoutine,
        deleteByPet,
      }}
    >
      {children}
    </RecordsContext.Provider>
  );
}

export function useRecords() {
  const context = useContext(RecordsContext);
  if (!context) {
    throw new Error('useRecords must be used within RecordsProvider');
  }
  return context;
}
