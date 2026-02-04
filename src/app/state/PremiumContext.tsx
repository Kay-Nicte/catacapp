import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export type PremiumPlan = 'free' | 'monthly' | 'yearly' | 'lifetime';

export interface PremiumStatus {
  isPremium: boolean;
  plan: PremiumPlan;
  expiresAt?: string; // ISO string
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

const PREMIUM_STORAGE_KEY = '@catacapp_premium';

// Funcionalidades premium
export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'export',
    name: 'Exportar datos',
    description: 'Exporta todos los datos de tus mascotas a PDF o CSV',
    icon: 'download',
  },
  {
    id: 'charts',
    name: 'Gráficos y estadísticas',
    description: 'Visualiza la evolución del peso, comidas y más',
    icon: 'stats-chart',
  },
  {
    id: 'unlimited_pets',
    name: 'Mascotas ilimitadas',
    description: 'Añade todas las mascotas que quieras',
    icon: 'paw',
  },
  {
    id: 'cloud_backup',
    name: 'Backup en la nube',
    description: 'Tus datos siempre seguros y sincronizados',
    icon: 'cloud-upload',
  },
  {
    id: 'reminders',
    name: 'Recordatorios avanzados',
    description: 'Notificaciones personalizadas para vacunas y citas',
    icon: 'notifications',
  },
  {
    id: 'premium_avatars',
    name: 'Avatares exclusivos',
    description: 'Desbloquea razas premium: Bengala, Maine Coon, Husky y más',
    icon: 'happy',
  },
  {
    id: 'no_ads',
    name: 'Sin publicidad',
    description: 'Disfruta de la app sin interrupciones',
    icon: 'eye-off',
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
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    plan: 'free',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Cargar estado premium al iniciar o cuando cambie el usuario
  useEffect(() => {
    if (user) {
      loadPremiumStatus();
    } else {
      setStatus({ isPremium: false, plan: 'free' });
      setIsLoading(false);
    }
  }, [user]);

  const loadPremiumStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(`${PREMIUM_STORAGE_KEY}_${user?.id}`);
      if (stored) {
        const premiumData: PremiumStatus = JSON.parse(stored);

        // Verificar si ha expirado
        if (premiumData.expiresAt && new Date(premiumData.expiresAt) < new Date()) {
          // Suscripción expirada
          setStatus({ isPremium: false, plan: 'free' });
        } else {
          setStatus(premiumData);
        }
      }
    } catch (error) {
      console.error('Error loading premium status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = async (plan: PremiumPlan): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Debes iniciar sesión' };
    }

    try {
      // Aquí iría la integración con el sistema de pagos (Google Play Billing, RevenueCat, etc.)
      // Por ahora simulamos la compra

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
          expiresAt = undefined; // Nunca expira
          break;
      }

      const newStatus: PremiumStatus = {
        isPremium: true,
        plan,
        expiresAt,
        purchasedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(`${PREMIUM_STORAGE_KEY}_${user.id}`, JSON.stringify(newStatus));
      setStatus(newStatus);

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al procesar la compra' };
    }
  };

  const restore = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Debes iniciar sesión' };
    }

    try {
      // Aquí iría la verificación con el sistema de pagos
      // Por ahora solo recargamos del storage
      await loadPremiumStatus();

      if (status.isPremium) {
        return { success: true };
      } else {
        return { success: false, error: 'No se encontraron compras anteriores' };
      }
    } catch (error) {
      return { success: false, error: 'Error al restaurar compras' };
    }
  };

  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Debes iniciar sesión' };
    }

    if (!status.isPremium) {
      return { success: false, error: 'No tienes una suscripción activa' };
    }

    try {
      // Aquí iría la cancelación real con el sistema de pagos
      // Por ahora simplemente limpiamos el estado
      const newStatus: PremiumStatus = {
        isPremium: false,
        plan: 'free',
      };

      await AsyncStorage.setItem(`${PREMIUM_STORAGE_KEY}_${user.id}`, JSON.stringify(newStatus));
      setStatus(newStatus);

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al cancelar la suscripción' };
    }
  };

  const checkFeatureAccess = (featureId: string): boolean => {
    if (status.isPremium) return true;

    // Algunas features básicas disponibles para free
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
