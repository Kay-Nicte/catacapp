import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { FirestoreHousehold } from '../../types/firestore';
import {
  getUserDoc,
  onHouseholdSnapshot,
  createInviteCode,
  joinHousehold as joinHouseholdService,
  mergePetsToHousehold,
  leaveHousehold as leaveHouseholdService,
  removeMember as removeMemberService,
  getMemberEmails,
} from '../../services/firestore';
import { migrateToFirestore } from '../../services/migration';

interface HouseholdMember {
  id: string;
  email: string;
}

interface HouseholdContextType {
  household: FirestoreHousehold | null;
  householdId: string | null;
  members: HouseholdMember[];
  isOwner: boolean;
  loading: boolean;
  generateInviteCode: () => Promise<string>;
  joinHousehold: (code: string, mergePets: boolean) => Promise<{ success: boolean; error?: string }>;
  leaveHousehold: () => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t: tr } = useTranslation();
  const [household, setHousehold] = useState<FirestoreHousehold | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize: ensure user doc exists and get householdId
  useEffect(() => {
    if (!user) {
      setHousehold(null);
      setHouseholdId(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);

        // Migrate from AsyncStorage if needed (creates user doc + household)
        const { householdId: hId } = await migrateToFirestore(user.id, user.email);

        if (!cancelled) {
          setHouseholdId(hId);
        }
      } catch (error) {
        console.error('Error initializing household:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Listen to household doc changes
  useEffect(() => {
    if (!householdId) return;

    const unsub = onHouseholdSnapshot(householdId, (data) => {
      setHousehold(data);

      // Load member emails
      if (data?.memberIds) {
        getMemberEmails(data.memberIds).then(setMembers);
      } else {
        setMembers([]);
      }
    });

    return unsub;
  }, [householdId]);

  const isOwner = !!(user && household && household.ownerId === user.id);

  const generateInvite = useCallback(async (): Promise<string> => {
    if (!user || !householdId) throw new Error('No household');
    return createInviteCode(householdId, user.id);
  }, [user, householdId]);

  const joinHouseholdHandler = useCallback(
    async (code: string, mergePets: boolean): Promise<{ success: boolean; error?: string }> => {
      if (!user || !householdId) return { success: false, error: 'noUser' };

      try {
        const oldHouseholdId = householdId;
        const result = await joinHouseholdService(user.id, code, mergePets);

        if (!result.success) {
          return { success: false, error: result.error };
        }

        // If merge requested, copy pets from old household to new
        if (mergePets && result.newHouseholdId) {
          await mergePetsToHousehold(oldHouseholdId, result.newHouseholdId);
        }

        // Update local state
        if (result.newHouseholdId) {
          setHouseholdId(result.newHouseholdId);
        }

        return { success: true };
      } catch (error) {
        console.error('Error joining household:', error);
        return { success: false, error: 'joinError' };
      }
    },
    [user, householdId]
  );

  const leaveHouseholdHandler = useCallback(async () => {
    if (!user) return;

    try {
      const newHId = await leaveHouseholdService(user.id);
      setHouseholdId(newHId);
    } catch (error) {
      console.error('Error leaving household:', error);
      Alert.alert(tr('common.error'), tr('household.leaveError'));
    }
  }, [user, tr]);

  const removeMemberHandler = useCallback(
    async (targetUserId: string) => {
      if (!user) return;

      try {
        await removeMemberService(user.id, targetUserId);
      } catch (error) {
        console.error('Error removing member:', error);
        Alert.alert(tr('common.error'), tr('household.removeError'));
      }
    },
    [user, tr]
  );

  return (
    <HouseholdContext.Provider
      value={{
        household,
        householdId,
        members,
        isOwner,
        loading,
        generateInviteCode: generateInvite,
        joinHousehold: joinHouseholdHandler,
        leaveHousehold: leaveHouseholdHandler,
        removeMember: removeMemberHandler,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within HouseholdProvider');
  }
  return context;
}
