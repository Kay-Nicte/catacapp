import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import mobileAds, { MaxAdContentRating, InterstitialAd, AdEventType } from "react-native-google-mobile-ads";
import { usePremium } from "./PremiumContext";

// IDs de producción de AdMob
export const AD_UNIT_IDS = {
  BANNER: "ca-app-pub-4638960090268476/7223753314",
  INTERSTITIAL: "ca-app-pub-4638960090268476/4533515959",
};

interface AdsContextType {
  isAdsInitialized: boolean;
  showAds: boolean;
  showInterstitial: () => void;
  incrementActionCount: () => void;
}

const AdsContext = createContext<AdsContextType | undefined>(undefined);

// Mostrar intersticial cada X acciones
const ACTIONS_BEFORE_INTERSTITIAL = 3;

export function AdsProvider({ children }: { children: ReactNode }) {
  const [isAdsInitialized, setIsAdsInitialized] = useState(false);
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);
  const actionCountRef = useRef(0);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const { isPremium } = usePremium();

  useEffect(() => {
    initializeAds();
  }, []);

  useEffect(() => {
    if (isAdsInitialized && !isPremium) {
      loadInterstitial();
    }
  }, [isAdsInitialized, isPremium]);

  const initializeAds = async () => {
    try {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });

      await mobileAds().initialize();
      setIsAdsInitialized(true);
      console.log("AdMob initialized successfully");
    } catch (error) {
      console.error("Failed to initialize AdMob:", error);
    }
  };

  const loadInterstitial = () => {
    const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setIsInterstitialLoaded(true);
      console.log("Interstitial loaded");
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setIsInterstitialLoaded(false);
      // Cargar otro para la próxima vez
      loadInterstitial();
    });

    interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log("Interstitial error:", error);
      setIsInterstitialLoaded(false);
    });

    interstitial.load();
    interstitialRef.current = interstitial;
  };

  const showInterstitial = () => {
    if (isPremium) return;

    if (isInterstitialLoaded && interstitialRef.current) {
      interstitialRef.current.show();
    }
  };

  // Incrementar contador de acciones y mostrar intersticial si toca
  const incrementActionCount = () => {
    if (isPremium) return;

    actionCountRef.current += 1;

    if (actionCountRef.current >= ACTIONS_BEFORE_INTERSTITIAL) {
      actionCountRef.current = 0;
      showInterstitial();
    }
  };

  const showAds = isAdsInitialized && !isPremium;

  return (
    <AdsContext.Provider value={{ isAdsInitialized, showAds, showInterstitial, incrementActionCount }}>
      {children}
    </AdsContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error("useAds must be used within AdsProvider");
  }
  return context;
}
