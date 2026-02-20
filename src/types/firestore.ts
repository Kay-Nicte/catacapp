import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { PetType, PetStatus } from '../app/state/PetContext';
import { RecordType } from '../app/state/RecordsContext';
import { PremiumPlan } from '../app/state/PremiumContext';

export interface FirestoreUser {
  email: string;
  householdId: string | null;
  migratedFromAsync: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

export interface FirestorePremiumStatus {
  isPremium: boolean;
  plan: PremiumPlan;
  expiresAt?: string;
  purchasedAt?: string;
}

export interface FirestoreHousehold {
  ownerId: string;
  memberIds: string[];
  premiumStatus: FirestorePremiumStatus | null;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

export interface FirestorePet {
  name: string;
  type: PetType;
  status: PetStatus;
  avatarKey: string;
  birthDate?: string;
  deceasedAt?: string;
}

export interface FirestoreRecord {
  petId: string;
  type: RecordType;
  title: string;
  value: string;
  timestamp: string;
  source: 'MANUAL' | 'ROUTINE';
  routineId?: string;
  customTime?: string;
}

export interface FirestoreRoutine {
  petId: string;
  type: RecordType;
  title: string;
  time: string;
  defaultValue?: string;
  active: boolean;
  days?: number[];
}

export interface FirestoreVaccine {
  petId: string;
  name: string;
  date: string;
  nextDose?: string;
  notes?: string;
}

export interface FirestoreVetVisit {
  petId: string;
  type: 'PAST' | 'UPCOMING';
  date: string;
  veterinarian: string;
  reason: string;
  notes: string;
}

export interface FirestoreInvite {
  householdId: string;
  createdBy: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  expiresAt: FirebaseFirestoreTypes.Timestamp;
  used: boolean;
}
