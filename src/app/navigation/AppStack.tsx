import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import AppTabs from "./AppTabs";
import { useTheme } from "../../theme/useTheme";
import PetFormScreen from "../../screens/PetFormScreen";
import PremiumScreen from "../../screens/PremiumScreen";
import ChartsScreen from "../../screens/ChartsScreen";
import HouseholdScreen from "../../screens/HouseholdScreen";
import { TabsParamList } from "./AppTabs";
import { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  PetForm: { petId?: string } | undefined;
  Premium: undefined;
  Charts: undefined;
  Household: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppStack() {
  const t = useTheme();
  const { t: tr } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Tabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PetForm"
        component={PetFormScreen}
        options={{
          title: tr('nav.pet'),
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Charts"
        component={ChartsScreen}
        options={{
          title: tr('nav.stats'),
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="Household"
        component={HouseholdScreen}
        options={{
          title: tr('household.title'),
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
