import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export type RecordType = 'FOOD' | 'POOP' | 'SLEEP' | 'WEIGHT' | 'NOTE';

export interface Record {
  id: string;
  petId: string;
  type: RecordType;
  title: string;
  value: string;
  timestamp: string; // ISO string para serialización
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
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

const RECORDS_STORAGE_KEY = '@catacapp_records';
const ROUTINES_STORAGE_KEY = '@catacapp_routines';
const ROUTINE_STATUS_KEY = '@catacapp_routine_status';

export function RecordsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<Record[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [dailyRoutineStatus, setDailyRoutineStatus] = useState<Map<string, 'PENDING' | 'DONE' | 'SKIPPED'>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const recordsKey = `${RECORDS_STORAGE_KEY}_${user?.id}`;
  const routinesKey = `${ROUTINES_STORAGE_KEY}_${user?.id}`;
  const statusKey = `${ROUTINE_STATUS_KEY}_${user?.id}`;

  // Cargar datos al iniciar
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Guardar records cuando cambien
  useEffect(() => {
    if (!isLoading && user) {
      AsyncStorage.setItem(recordsKey, JSON.stringify(records));
    }
  }, [records, isLoading, user]);

  // Guardar routines cuando cambien
  useEffect(() => {
    if (!isLoading && user) {
      AsyncStorage.setItem(routinesKey, JSON.stringify(routines));
    }
  }, [routines, isLoading, user]);

  // Guardar routine status cuando cambie
  useEffect(() => {
    if (!isLoading && user) {
      const statusObj = Object.fromEntries(dailyRoutineStatus);
      AsyncStorage.setItem(statusKey, JSON.stringify(statusObj));
    }
  }, [dailyRoutineStatus, isLoading, user]);

  const loadData = async () => {
    try {
      const [storedRecords, storedRoutines, storedStatus] = await Promise.all([
        AsyncStorage.getItem(recordsKey),
        AsyncStorage.getItem(routinesKey),
        AsyncStorage.getItem(statusKey),
      ]);

      if (storedRecords) {
        setRecords(JSON.parse(storedRecords));
      }
      if (storedRoutines) {
        setRoutines(JSON.parse(storedRoutines));
      }
      if (storedStatus) {
        setDailyRoutineStatus(new Map(Object.entries(JSON.parse(storedStatus))));
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRecord = (record: Omit<Record, 'id' | 'timestamp'>) => {
    const newRecord: Record = {
      ...record,
      id: `r_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
    };
    setRecords(prev => [newRecord, ...prev]);
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const updateRecord = (id: string, updates: Partial<Omit<Record, 'id' | 'timestamp'>>) => {
    setRecords(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
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
    const newRoutine: Routine = {
      ...routine,
      id: `rt_${Date.now()}_${Math.random()}`,
    };
    setRoutines(prev => [...prev, newRoutine]);
  };

  const deleteRoutine = (id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const updateRoutine = (id: string, updates: Partial<Routine>) => {
    setRoutines(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
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
