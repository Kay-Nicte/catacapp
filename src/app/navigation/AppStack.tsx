import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppTabs from "./AppTabs";
import { useTheme } from "../../theme/useTheme";
import PetFormScreen from "../../screens/PetFormScreen";
import PremiumScreen from "../../screens/PremiumScreen";
import ChartsScreen from "../../screens/ChartsScreen";
import { TabsParamList } from "./AppTabs";
import { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  PetForm: { petId?: string } | undefined;
  Premium: undefined;
  Charts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppStack() {
  const t = useTheme();

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
          title: "Mascota",
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
          title: "Estadísticas",
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
