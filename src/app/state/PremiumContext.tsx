import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { updateHouseholdPremium } from '../../services/firestore';
import type { FirestorePremiumStatus } from '../../types/firestore';
import i18n from '../../i18n';

export type PremiumPlan = 'free' | 'monthly' | 'yearly' | 'lifetime';

export interface PremiumStatus {
  isPremium: boolean;
  plan: PremiumPlan;
  expiresAt?: string;
  purchasedAt?: string;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface PremiumContextType {
  status: PremiumStatus;
  isLoading: boolean;
  isPremium: boolean;
  features: PremiumFeature[];
  subscribe: (plan: PremiumPlan) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  checkFeatureAccess: (featureId: string) => boolean;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

// Funcionalidades premium
export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'noAds',
    name: 'Sin anuncios',
    description: 'Disfruta de la app sin interrupciones publicitarias',
    icon: 'eye-off',
  },
  {
    id: 'charts',
    name: 'Gráficos y estadísticas',
    description: 'Visualiza la evolución de salud de tu mascota',
    icon: 'stats-chart',
  },
  {
    id: 'unlimitedPets',
    name: 'Mascotas ilimitadas',
    description: 'Añade todas las mascotas que quieras',
    icon: 'paw',
  },
  {
    id: 'export',
    name: 'Exportar datos',
    description: 'Descarga tus registros en formato CSV',
    icon: 'download',
  },
  {
    id: 'backup',
    name: 'Backup completo',
    description: 'Crea y restaura copias de seguridad',
    icon: 'cloud-upload',
  },
  {
    id: 'reminders',
    name: 'Recordatorios avanzados',
    description: 'Configura recordatorios personalizados',
    icon: 'notifications',
  },
];

// Límites para usuarios free
export const FREE_LIMITS = {
  maxPets: 2,
};

// Precios (para mostrar en UI)
export const PREMIUM_PRICES = {
  monthly: { price: 2.99, period: 'mes' },
  yearly: { price: 19.99, period: 'año', savings: '44%' },
  lifetime: { price: 49.99, period: 'para siempre' },
};

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { household, householdId, loading: householdLoading } = useHousehold();
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    plan: 'free',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Derive premium status from household doc
  useEffect(() => {
    if (!user) {
      setStatus({ isPremium: false, plan: 'free' });
      setIsLoading(false);
      return;
    }

    if (householdLoading) {
      setIsLoading(true);
      return;
    }

    if (household?.premiumStatus) {
      const ps = household.premiumStatus;

      // Check expiration
      if (ps.expiresAt && new Date(ps.expiresAt) < new Date()) {
        setStatus({ isPremium: false, plan: 'free' });
      } else {
        setStatus({
          isPremium: ps.isPremium,
          plan: ps.plan,
          expiresAt: ps.expiresAt,
          purchasedAt: ps.purchasedAt,
        });
      }
    } else {
      setStatus({ isPremium: false, plan: 'free' });
    }

    setIsLoading(false);
  }, [user, household, householdLoading]);

  const subscribe = async (plan: PremiumPlan): Promise<{ success: boolean; error?: string }> => {
    if (!user || !householdId) {
      return { success: false, error: i18n.t('auth.errors.loginRequired') };
    }

    try {
      // TODO: Integrate real payment system (Google Play Billing, RevenueCat)
      // Simulated purchase for now

      const now = new Date();
      let expiresAt: string | undefined;

      switch (plan) {
        case 'monthly':
          expiresAt = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
          break;
        case 'yearly':
          expiresAt = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
          break;
        case 'lifetime':
          expiresAt = undefined;
          break;
      }

      const premiumStatus: FirestorePremiumStatus = {
        isPremium: true,
        plan,
        expiresAt,
        purchasedAt: new Date().toISOString(),
      };

      // Write to household doc (propagates to all members via onSnapshot)
      await updateHouseholdPremium(householdId, premiumStatus);

      return { success: true };
    } catch (error) {
      return { success: false, error: i18n.t('auth.errors.purchaseError') };
    }
  };

  const restore = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: i18n.t('auth.errors.loginRequired') };
    }

    // TODO: Verify with real payment system
    if (status.isPremium) {
      return { success: true };
    } else {
      return { success: false, error: i18n.t('auth.errors.noPurchasesFound') };
    }
  };

  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !householdId) {
      return { success: false, error: i18n.t('auth.errors.loginRequired') };
    }

    if (!status.isPremium) {
      return { success: false, error: i18n.t('auth.errors.noActiveSub') };
    }

    try {
      // TODO: Cancel with real payment system
      await updateHouseholdPremium(householdId, null);

      return { success: true };
    } catch (error) {
      return { success: false, error: i18n.t('auth.errors.cancelError') };
    }
  };

  const checkFeatureAccess = (featureId: string): boolean => {
    if (status.isPremium) return true;

    const freeFeatures = ['basic_records', 'basic_reminders'];
    return freeFeatures.includes(featureId);
  };

  return (
    <PremiumContext.Provider
      value={{
        status,
        isLoading,
        isPremium: status.isPremium,
        features: PREMIUM_FEATURES,
        subscribe,
        restore,
        cancelSubscription,
        checkFeatureAccess,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
}
