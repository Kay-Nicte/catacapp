import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useAds, AD_UNIT_IDS } from "../app/state/AdsContext";

const RETRY_DELAY = 30000; // Reintentar cada 30 segundos si falla
const MAX_RETRIES = 5;

interface AdBannerProps {
  size?: BannerAdSize;
}

export default function AdBanner({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }: AdBannerProps) {
  const { showAds } = useAds();
  const [adLoaded, setAdLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const scheduleRetry = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setRetryKey(prev => prev + 1);
      }, RETRY_DELAY);
      return () => clearTimeout(timer);
    }
  }, [retryCount]);

  if (!showAds) {
    return null;
  }

  return (
    <View style={[styles.container, !adLoaded && styles.hidden]}>
      <BannerAd
        key={`banner-${retryKey}`}
        unitId={AD_UNIT_IDS.BANNER}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          setAdLoaded(true);
          setRetryCount(0);
        }}
        onAdFailedToLoad={(error) => {
          console.log("Banner ad failed to load:", error);
          setAdLoaded(false);
          scheduleRetry();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: {
    height: 0,
    overflow: "hidden",
  },
});
