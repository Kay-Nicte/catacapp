import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
  PurchasesEntitlementInfo,
  PACKAGE_TYPE,
} from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { updateHouseholdPremium } from '../../services/firestore';
import type { FirestorePremiumStatus } from '../../types/firestore';
import i18n from '../../i18n';

// ── RevenueCat config ─────────────────────────────────────
// Replace with your public Google Play API key from RevenueCat dashboard
const REVENUECAT_API_KEY = 'goog_MlSpViRBMSgJSpshiwBPZiWKwvc';
const ENTITLEMENT_ID = 'catacapp_pro';

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
  packages: PurchasesPackage[];
  packagesLoading: boolean;
  subscribe: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  redeemCode: (code: string) => Promise<{ success: boolean; error?: string }>;
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

// Fallback prices (shown when RevenueCat offerings unavailable)
export const PREMIUM_PRICES = {
  monthly: { price: 3.99, period: 'mes' },
  yearly: { price: 29.99, period: 'año', savings: '37%' },
  lifetime: { price: 69.99, period: 'para siempre' },
};

// ── Helpers ───────────────────────────────────────────────

function mapPackageToPlan(pkg: PurchasesPackage): PremiumPlan {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return 'monthly';
    case PACKAGE_TYPE.ANNUAL:
      return 'yearly';
    case PACKAGE_TYPE.LIFETIME:
      return 'lifetime';
    default:
      // Fallback: try to infer from identifier
      if (pkg.identifier.includes('monthly')) return 'monthly';
      if (pkg.identifier.includes('yearly') || pkg.identifier.includes('annual')) return 'yearly';
      if (pkg.identifier.includes('lifetime')) return 'lifetime';
      return 'monthly';
  }
}

function mapEntitlementToPlan(entitlement: PurchasesEntitlementInfo): PremiumPlan {
  const productId = entitlement.productIdentifier;
  if (productId.includes('lifetime')) return 'lifetime';
  if (productId.includes('yearly') || productId.includes('annual')) return 'yearly';
  return 'monthly';
}

// ── Provider ──────────────────────────────────────────────

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { household, householdId, loading: householdLoading } = useHousehold();
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    plan: 'free',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const configuredRef = useRef(false);
  const householdIdRef = useRef(householdId);

  // Keep ref in sync
  useEffect(() => {
    householdIdRef.current = householdId;
  }, [householdId]);

  // ── Initialize RevenueCat (once) ──────────────────────
  useEffect(() => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  }, []);

  // ── Login / Logout with RevenueCat ────────────────────
  useEffect(() => {
    if (user) {
      Purchases.logIn(user.id).catch(() => {
        // Silent fail — entitlement check still works with anonymous user
      });
    } else {
      Purchases.logOut().catch(() => {});
    }
  }, [user?.id]);

  // ── Load offerings ────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setPackages([]);
      return;
    }

    const loadOfferings = async () => {
      setPackagesLoading(true);
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }
      } catch {
        // Offerings unavailable — UI will use fallback static prices
      } finally {
        setPackagesLoading(false);
      }
    };

    loadOfferings();
  }, [user?.id]);

  // ── Sync premium from Firestore household (for all members) ──
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

  // ── RevenueCat customer info listener ─────────────────
  const syncEntitlementToFirestore = useCallback(async (info: CustomerInfo) => {
    const hId = householdIdRef.current;
    if (!hId) return;

    const entitlement = info.entitlements.active[ENTITLEMENT_ID];

    if (entitlement) {
      const premiumData: FirestorePremiumStatus = {
        isPremium: true,
        plan: mapEntitlementToPlan(entitlement),
        expiresAt: entitlement.expirationDate || undefined,
        purchasedAt: entitlement.originalPurchaseDate,
      };
      try {
        await updateHouseholdPremium(hId, premiumData);
      } catch {
        // Firestore unavailable — local state updated via household snapshot
      }
    } else {
      // Premium expired or cancelled
      try {
        await updateHouseholdPremium(hId, null);
      } catch {
        // Firestore unavailable
      }
    }
  }, []);

  useEffect(() => {
    Purchases.addCustomerInfoUpdateListener(syncEntitlementToFirestore);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(syncEntitlementToFirestore);
    };
  }, [syncEntitlementToFirestore]);

  // ── Subscribe via RevenueCat ──────────────────────────
  const subscribe = async (pkg: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: i18n.t('auth.errors.loginRequired') };
    }
    if (!householdId) {
      return { success: false, error: i18n.t('premium.setupError') };
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (entitlement) {
        const premiumData: FirestorePremiumStatus = {
          isPremium: true,
          plan: mapPackageToPlan(pkg),
          expiresAt: entitlement.expirationDate || undefined,
          purchasedAt: entitlement.originalPurchaseDate,
        };

        await updateHouseholdPremium(householdId, premiumData);
        return { success: true };
      }

      return { success: false, error: i18n.t('premium.purchaseError') };
    } catch (error: any) {
      // User cancelled the purchase flow
      if (error.userCancelled) {
        return { success: false, error: 'cancelled' };
      }
      return { success: false, error: i18n.t('premium.purchaseError') };
    }
  };

  // ── Redeem code (CATACAPPVIP bypass) ──────────────────
  const redeemCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: i18n.t('auth.errors.loginRequired') };
    }

    const trimmed = code.trim().toUpperCase();
    if (trimmed !== 'CATACAPPVIP') {
      return { success: false, error: i18n.t('premium.invalidCode') };
    }

    const premiumData: FirestorePremiumStatus = {
      isPremium: true,
      plan: 'lifetime',
      purchasedAt: new Date().toISOString(),
    };

    if (householdId) {
      try {
        await updateHouseholdPremium(householdId, premiumData);
      } catch {
        // Firestore not available, apply locally
        setStatus({
          isPremium: true,
          plan: 'lifetime',
          purchasedAt: premiumData.purchasedAt,
        });
      }
    } else {
      // No household yet, apply locally
      setStatus({
        isPremium: true,
        plan: 'lifetime',
        purchasedAt: premiumData.purchasedAt,
      });
    }

    return { success: true };
  };

  // ── Restore purchases via RevenueCat ──────────────────
  const restore = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: i18n.t('auth.errors.loginRequired') };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (entitlement) {
        if (householdId) {
          const premiumData: FirestorePremiumStatus = {
            isPremium: true,
            plan: mapEntitlementToPlan(entitlement),
            expiresAt: entitlement.expirationDate || undefined,
            purchasedAt: entitlement.originalPurchaseDate,
          };
          await updateHouseholdPremium(householdId, premiumData);
        }
        return { success: true };
      }

      return { success: false, error: i18n.t('auth.errors.noPurchasesFound') };
    } catch {
      return { success: false, error: i18n.t('auth.errors.restoreError') };
    }
  };

  // ── Cancel subscription — redirect to Google Play ─────
  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !householdId) {
      return { success: false, error: i18n.t('auth.errors.loginRequired') };
    }

    if (!status.isPremium) {
      return { success: false, error: i18n.t('auth.errors.noActiveSub') };
    }

    try {
      await Linking.openURL('https://play.google.com/store/account/subscriptions');
      return { success: true };
    } catch {
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
        packages,
        packagesLoading,
        subscribe,
        redeemCode,
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
