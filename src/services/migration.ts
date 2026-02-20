import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserDoc,
  createUserDoc,
  markUserMigrated,
  householdSubCol,
  db,
} from './firestore';
import { bulkSetNotificationIds } from './notificationMap';
import type { Pet } from '../app/state/PetContext';
import type { Record as HealthRecord, Routine } from '../app/state/RecordsContext';
import type { Vaccine } from '../app/state/VaccinesContext';
import type { VetVisit } from '../app/state/VetContext';
import type { PremiumStatus } from '../app/state/PremiumContext';

const KEYS = {
  pets: '@catacapp_pets',
  records: '@catacapp_records',
  routines: '@catacapp_routines',
  vetVisits: '@catacapp_vet_visits',
  vaccines: '@catacapp_vaccines',
  premium: '@catacapp_premium',
};

/**
 * One-time idempotent migration from AsyncStorage to Firestore.
 * - Reads all local data
 * - Creates user doc + household if needed
 * - Writes all documents to Firestore subcollections
 * - Extracts notificationIds to local notificationMap
 * - Marks user as migrated
 */
export async function migrateToFirestore(
  userId: string,
  email: string
): Promise<{ householdId: string; migrated: boolean }> {
  // Check if already migrated
  let userDoc = await getUserDoc(userId);

  if (userDoc?.migratedFromAsync) {
    return { householdId: userDoc.householdId!, migrated: false };
  }

  // Ensure user doc exists
  let householdId: string;
  if (!userDoc) {
    householdId = await createUserDoc(userId, email);
    userDoc = await getUserDoc(userId);
  } else {
    householdId = userDoc.householdId!;
  }

  if (!householdId) {
    // Shouldn't happen, but safety check
    householdId = await createUserDoc(userId, email);
  }

  // Read all data from AsyncStorage
  const [petsRaw, recordsRaw, routinesRaw, vetVisitsRaw, vaccinesRaw, premiumRaw] =
    await Promise.all([
      AsyncStorage.getItem(`${KEYS.pets}_${userId}`),
      AsyncStorage.getItem(`${KEYS.records}_${userId}`),
      AsyncStorage.getItem(`${KEYS.routines}_${userId}`),
      AsyncStorage.getItem(`${KEYS.vetVisits}_${userId}`),
      AsyncStorage.getItem(`${KEYS.vaccines}_${userId}`),
      AsyncStorage.getItem(`${KEYS.premium}_${userId}`),
    ]);

  const pets: Pet[] = petsRaw ? JSON.parse(petsRaw) : [];
  const records: HealthRecord[] = recordsRaw ? JSON.parse(recordsRaw) : [];
  const routines: Routine[] = routinesRaw ? JSON.parse(routinesRaw) : [];
  const vetVisits: VetVisit[] = vetVisitsRaw ? JSON.parse(vetVisitsRaw) : [];
  const vaccines: Vaccine[] = vaccinesRaw ? JSON.parse(vaccinesRaw) : [];
  const premiumStatus: PremiumStatus | null = premiumRaw ? JSON.parse(premiumRaw) : null;

  // Extract notificationIds before writing to Firestore
  const notifMap: Record<string, string> = {};

  vaccines.forEach((v) => {
    if (v.notificationId) {
      notifMap[v.id] = v.notificationId;
    }
  });

  vetVisits.forEach((v) => {
    if (v.notificationId) {
      notifMap[v.id] = v.notificationId;
    }
  });

  // Save notificationIds to local map
  if (Object.keys(notifMap).length > 0) {
    await bulkSetNotificationIds(userId, notifMap);
  }

  // Write data to Firestore in batches
  let batch = db.batch();
  let count = 0;

  const flushBatch = async () => {
    if (count > 0) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  };

  const addToBatch = (collection: string, id: string, data: any) => {
    const ref = householdSubCol(householdId, collection).doc(id);
    batch.set(ref, data);
    count++;
  };

  // Migrate pets
  for (const pet of pets) {
    const { id, ...data } = pet;
    addToBatch('pets', id, data);
    if (count >= 450) await flushBatch();
  }

  // Migrate records
  for (const record of records) {
    const { id, ...data } = record;
    addToBatch('records', id, data);
    if (count >= 450) await flushBatch();
  }

  // Migrate routines
  for (const routine of routines) {
    const { id, ...data } = routine;
    addToBatch('routines', id, data);
    if (count >= 450) await flushBatch();
  }

  // Migrate vaccines (without notificationId)
  for (const vaccine of vaccines) {
    const { id, notificationId, ...data } = vaccine;
    addToBatch('vaccines', id, data);
    if (count >= 450) await flushBatch();
  }

  // Migrate vet visits (without notificationId)
  for (const visit of vetVisits) {
    const { id, notificationId, ...data } = visit;
    addToBatch('vetVisits', id, data);
    if (count >= 450) await flushBatch();
  }

  await flushBatch();

  // Write premium status to household doc if exists
  if (premiumStatus && premiumStatus.isPremium) {
    const { updateHouseholdPremium } = await import('./firestore');
    await updateHouseholdPremium(householdId, premiumStatus);
  }

  // Mark user as migrated
  await markUserMigrated(userId);

  return { householdId, migrated: true };
}
