import './src/i18n';
import React, { useEffect, useCallback, useState } from "react";
import * as Updates from 'expo-updates';
import { StatusBar, View, ActivityIndicator, Text, TextInput } from "react-native";
import * as ScreenOrientation from 'expo-screen-orientation';
import { getDeviceTypeAsync, DeviceType } from 'expo-device';
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from "@expo-google-fonts/montserrat";
import { fonts } from "./src/theme/fonts";
import { ThemeProvider } from "./src/app/state/ThemeContext";
import { useTheme } from "./src/theme/useTheme";
import { PetProvider } from "./src/app/state/PetContext";
import { AuthProvider, useAuth } from "./src/app/state/AuthContext";
import { PremiumProvider } from "./src/app/state/PremiumContext";
import { OnboardingProvider, useOnboarding } from "./src/app/state/OnboardingContext";
import AppStack from "./src/app/navigation/AppStack";
import AuthStack from "./src/app/navigation/AuthStack";
import { RecordsProvider } from "./src/app/state/RecordsContext";
import { VetProvider } from "./src/app/state/VetContext";
import { VaccinesProvider } from "./src/app/state/VaccinesContext";
import { NotificationProvider } from "./src/app/state/NotificationContext";
import { AdsProvider } from "./src/app/state/AdsContext";
import { HouseholdProvider } from "./src/app/state/HouseholdContext";
import { ToastProvider } from "./src/components/ui/Toast";
import FullscreenSplash from "./src/components/FullscreenSplash";

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const t = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isOnboardingLoading } = useOnboarding();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
  });

  // Apply Montserrat as default font for all Text and TextInput
  if (fontsLoaded) {
    const defaultTextStyle = { fontFamily: fonts.regular };
    const origTextRender = (Text as any).render;
    if (origTextRender && !(Text as any).__fontPatched) {
      (Text as any).__fontPatched = true;
      (Text as any).render = function (props: any, ref: any) {
        const { style, ...rest } = props;
        return origTextRender.call(this, { ...rest, style: [defaultTextStyle, style] }, ref);
      };
    }
    const origInputRender = (TextInput as any).render;
    if (origInputRender && !(TextInput as any).__fontPatched) {
      (TextInput as any).__fontPatched = true;
      (TextInput as any).render = function (props: any, ref: any) {
        const { style, ...rest } = props;
        return origInputRender.call(this, { ...rest, style: [defaultTextStyle, style] }, ref);
      };
    }
  }

  const isLoading = isAuthLoading || isOnboardingLoading || !fontsLoaded;
  const [showSplash, setShowSplash] = useState(true);

  const onLayoutRootView = useCallback(async () => {
    if (!isLoading) {
      await SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#0E0F10' }}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <HouseholdProvider>
          <PremiumProvider>
            <AdsProvider>
              <NotificationProvider>
                <PetProvider>
                  <RecordsProvider>
                    <VetProvider>
                      <VaccinesProvider>
                        <AppStack />
                      </VaccinesProvider>
                    </VetProvider>
                  </RecordsProvider>
                </PetProvider>
              </NotificationProvider>
            </AdsProvider>
          </PremiumProvider>
        </HouseholdProvider>
      ) : (
        <AuthStack />
      )}
      {showSplash && <FullscreenSplash onFinish={() => setShowSplash(false)} />}
    </NavigationContainer>
  );
}

function AppContent() {
  const t = useTheme();

  useEffect(() => {
    if (__DEV__) return;
    Updates.checkForUpdateAsync()
      .then(({ isAvailable }) => {
        if (isAvailable) return Updates.fetchUpdateAsync();
      })
      .then((result) => {
        if (result?.isNew) Updates.reloadAsync();
      })
      .catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <OnboardingProvider>
        <StatusBar
          barStyle={t.bg === "#0E0F10" ? "light-content" : "dark-content"}
        />
        <Navigation />
      </OnboardingProvider>
    </AuthProvider>
  );
}

export default function App() {
  useEffect(() => {
    getDeviceTypeAsync().then(type => {
      if (type === DeviceType.PHONE) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
