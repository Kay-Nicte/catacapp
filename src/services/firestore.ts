import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  FirestoreUser,
  FirestoreHousehold,
  FirestoreInvite,
  FirestorePremiumStatus,
} from '../types/firestore';

// ── Collection references ──────────────────────────────────

export const db = firestore();

export const usersCol = () => db.collection('users');
export const householdsCol = () => db.collection('households');
export const invitesCol = () => db.collection('invites');

export function householdSubCol(householdId: string, sub: string) {
  return householdsCol().doc(householdId).collection(sub);
}

// ── User ───────────────────────────────────────────────────

export async function getUserDoc(userId: string): Promise<FirestoreUser | null> {
  const snap = await usersCol().doc(userId).get();
  return snap.data() ? (snap.data() as FirestoreUser) : null;
}

export async function createUserDoc(userId: string, email: string): Promise<string> {
  // Create personal household
  const householdRef = householdsCol().doc();
  const householdId = householdRef.id;

  const batch = db.batch();

  batch.set(householdRef, {
    ownerId: userId,
    memberIds: [userId],
    premiumStatus: null,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as Omit<FirestoreHousehold, 'createdAt'> & { createdAt: FirebaseFirestoreTypes.FieldValue });

  batch.set(usersCol().doc(userId), {
    email,
    householdId,
    migratedFromAsync: false,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as Omit<FirestoreUser, 'createdAt'> & { createdAt: FirebaseFirestoreTypes.FieldValue });

  await batch.commit();
  return householdId;
}

export async function markUserMigrated(userId: string): Promise<void> {
  await usersCol().doc(userId).update({ migratedFromAsync: true });
}

// ── Household ──────────────────────────────────────────────

export async function getHousehold(householdId: string): Promise<FirestoreHousehold | null> {
  const snap = await householdsCol().doc(householdId).get();
  return snap.data() ? (snap.data() as FirestoreHousehold) : null;
}

export function onHouseholdSnapshot(
  householdId: string,
  callback: (data: FirestoreHousehold | null) => void
): () => void {
  return householdsCol().doc(householdId).onSnapshot((snap) => {
    callback(snap.data() ? (snap.data() as FirestoreHousehold) : null);
  });
}

export async function updateHouseholdPremium(
  householdId: string,
  premiumStatus: FirestorePremiumStatus | null
): Promise<void> {
  await householdsCol().doc(householdId).update({ premiumStatus });
}

// ── Invite codes ───────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createInviteCode(householdId: string, userId: string): Promise<string> {
  const code = generateCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await invitesCol().doc(code).set({
    householdId,
    createdBy: userId,
    createdAt: firestore.Timestamp.fromDate(now),
    expiresAt: firestore.Timestamp.fromDate(expiresAt),
    used: false,
  } as FirestoreInvite);

  return code;
}

export async function validateInviteCode(
  code: string
): Promise<{ valid: boolean; householdId?: string; error?: string }> {
  const snap = await invitesCol().doc(code.toUpperCase()).get();
  if (!snap.data()) {
    return { valid: false, error: 'invalidCode' };
  }

  const invite = snap.data() as FirestoreInvite;

  if (invite.used) {
    return { valid: false, error: 'codeUsed' };
  }

  const now = new Date();
  const expiresAt = invite.expiresAt.toDate();
  if (now > expiresAt) {
    return { valid: false, error: 'codeExpired' };
  }

  return { valid: true, householdId: invite.householdId };
}

// ── Join / Leave household ─────────────────────────────────

export async function joinHousehold(
  userId: string,
  code: string,
  mergePets: boolean
): Promise<{ success: boolean; newHouseholdId?: string; error?: string }> {
  const upperCode = code.toUpperCase();

  return db.runTransaction(async (tx) => {
    // 1. Validate invite
    const inviteRef = invitesCol().doc(upperCode);
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.data()) {
      return { success: false, error: 'invalidCode' };
    }
    const invite = inviteSnap.data() as FirestoreInvite;

    if (invite.used) return { success: false, error: 'codeUsed' };
    if (invite.expiresAt.toDate() < new Date()) return { success: false, error: 'codeExpired' };

    // 2. Check target household has room
    const targetHouseholdRef = householdsCol().doc(invite.householdId);
    const targetSnap = await tx.get(targetHouseholdRef);
    if (!targetSnap.data()) return { success: false, error: 'householdNotFound' };

    const targetHousehold = targetSnap.data() as FirestoreHousehold;
    if (targetHousehold.memberIds.length >= 2) {
      return { success: false, error: 'maxMembers' };
    }

    // 3. Get current user doc
    const userRef = usersCol().doc(userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.data()) return { success: false, error: 'userNotFound' };

    const userData = userSnap.data() as FirestoreUser;
    const oldHouseholdId = userData.householdId;

    // 4. Mark invite as used
    tx.update(inviteRef, { used: true });

    // 5. Add user to target household
    tx.update(targetHouseholdRef, {
      memberIds: firestore.FieldValue.arrayUnion(userId),
    });

    // 6. Update user's householdId
    tx.update(userRef, { householdId: invite.householdId });

    return {
      success: true,
      newHouseholdId: invite.householdId,
      oldHouseholdId,
      mergePets,
    } as any;
  });
}

export async function mergePetsToHousehold(
  oldHouseholdId: string,
  newHouseholdId: string
): Promise<void> {
  // Move all data from old household to new
  const collections = ['pets', 'records', 'routines', 'vaccines', 'vetVisits'];

  for (const col of collections) {
    const snapshot = await householdSubCol(oldHouseholdId, col).get();
    if (snapshot.empty) continue;

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      const newRef = householdSubCol(newHouseholdId, col).doc(doc.id);
      batch.set(newRef, doc.data());
      count++;

      // Firestore batch limit is 500
      if (count >= 450) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  }
}

export async function deleteHouseholdData(householdId: string): Promise<void> {
  const collections = ['pets', 'records', 'routines', 'vaccines', 'vetVisits'];

  for (const col of collections) {
    const snapshot = await householdSubCol(householdId, col).get();
    if (snapshot.empty) continue;

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      if (count >= 450) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  }
}

export async function leaveHousehold(userId: string): Promise<string> {
  const userDoc = await getUserDoc(userId);
  if (!userDoc || !userDoc.householdId) throw new Error('No household');

  const oldHouseholdId = userDoc.householdId;
  const household = await getHousehold(oldHouseholdId);
  if (!household) throw new Error('Household not found');

  // Create new personal household for the leaving user
  const newHouseholdRef = householdsCol().doc();
  const newHouseholdId = newHouseholdRef.id;

  const batch = db.batch();

  // Create new personal household
  batch.set(newHouseholdRef, {
    ownerId: userId,
    memberIds: [userId],
    premiumStatus: null,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // Update user doc
  batch.update(usersCol().doc(userId), { householdId: newHouseholdId });

  // Remove from old household
  batch.update(householdsCol().doc(oldHouseholdId), {
    memberIds: firestore.FieldValue.arrayRemove(userId),
  });

  // If the leaving user was the owner and there's another member, transfer ownership
  if (household.ownerId === userId) {
    const otherMember = household.memberIds.find((id) => id !== userId);
    if (otherMember) {
      batch.update(householdsCol().doc(oldHouseholdId), {
        ownerId: otherMember,
      });
    }
  }

  await batch.commit();
  return newHouseholdId;
}

export async function removeMember(ownerId: string, targetUserId: string): Promise<void> {
  const ownerDoc = await getUserDoc(ownerId);
  if (!ownerDoc?.householdId) throw new Error('No household');

  const household = await getHousehold(ownerDoc.householdId);
  if (!household) throw new Error('Household not found');
  if (household.ownerId !== ownerId) throw new Error('Not the owner');
  if (!household.memberIds.includes(targetUserId)) throw new Error('User not in household');

  // Create new personal household for the removed user
  const newHouseholdRef = householdsCol().doc();
  const newHouseholdId = newHouseholdRef.id;

  const batch = db.batch();

  batch.set(newHouseholdRef, {
    ownerId: targetUserId,
    memberIds: [targetUserId],
    premiumStatus: null,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  batch.update(usersCol().doc(targetUserId), { householdId: newHouseholdId });

  batch.update(householdsCol().doc(ownerDoc.householdId), {
    memberIds: firestore.FieldValue.arrayRemove(targetUserId),
  });

  await batch.commit();
}

// ── Generic subcollection CRUD ─────────────────────────────

export async function addDocument<T extends Record<string, any>>(
  householdId: string,
  collection: string,
  data: T
): Promise<string> {
  const ref = await householdSubCol(householdId, collection).add(data);
  return ref.id;
}

export async function updateDocument(
  householdId: string,
  collection: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  await householdSubCol(householdId, collection).doc(docId).update(data);
}

export async function deleteDocument(
  householdId: string,
  collection: string,
  docId: string
): Promise<void> {
  await householdSubCol(householdId, collection).doc(docId).delete();
}

export function onCollectionSnapshot<T>(
  householdId: string,
  collection: string,
  callback: (items: (T & { id: string })[]) => void
): () => void {
  return householdSubCol(householdId, collection).onSnapshot((snap) => {
    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as T),
    }));
    callback(items);
  });
}

export async function deleteDocumentsWhere(
  householdId: string,
  collection: string,
  field: string,
  value: any
): Promise<string[]> {
  const snap = await householdSubCol(householdId, collection)
    .where(field, '==', value)
    .get();

  if (snap.empty) return [];

  const deletedIds: string[] = [];
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deletedIds.push(doc.id);
  });
  await batch.commit();
  return deletedIds;
}

export async function getDocumentsWhere<T>(
  householdId: string,
  collection: string,
  field: string,
  value: any
): Promise<(T & { id: string })[]> {
  const snap = await householdSubCol(householdId, collection)
    .where(field, '==', value)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as T),
  }));
}

// ── Get member emails for display ──────────────────────────

export async function getMemberEmails(
  memberIds: string[]
): Promise<{ id: string; email: string }[]> {
  const results: { id: string; email: string }[] = [];
  for (const id of memberIds) {
    const doc = await getUserDoc(id);
    if (doc) {
      results.push({ id, email: doc.email });
    }
  }
  return results;
}
