import './src/i18n';
import React, { useEffect, useCallback } from "react";
import { StatusBar, View, ActivityIndicator, Text, TextInput } from "react-native";
import * as ScreenOrientation from 'expo-screen-orientation';
import { getDeviceTypeAsync, DeviceType } from 'expo-device';
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from "@expo-google-fonts/poppins";
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

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const t = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isOnboardingLoading } = useOnboarding();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  // Apply Poppins as default font for all Text and TextInput
  if (fontsLoaded) {
    const defaultTextStyle = { fontFamily: fonts.regular };
    const origTextRender = (Text as any).render;
    if (origTextRender && !(Text as any).__poppinsPatched) {
      (Text as any).__poppinsPatched = true;
      (Text as any).render = function (props: any, ref: any) {
        const { style, ...rest } = props;
        return origTextRender.call(this, { ...rest, style: [defaultTextStyle, style] }, ref);
      };
    }
    const origInputRender = (TextInput as any).render;
    if (origInputRender && !(TextInput as any).__poppinsPatched) {
      (TextInput as any).__poppinsPatched = true;
      (TextInput as any).render = function (props: any, ref: any) {
        const { style, ...rest } = props;
        return origInputRender.call(this, { ...rest, style: [defaultTextStyle, style] }, ref);
      };
    }
  }

  const isLoading = isAuthLoading || isOnboardingLoading || !fontsLoaded;

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.bg }}>
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
    </NavigationContainer>
  );
}

function AppContent() {
  const t = useTheme();

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
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
