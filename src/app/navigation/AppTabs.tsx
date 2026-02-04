import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import HomeScreen from "../../screens/HomeScreen";
import RecordsScreen from "../../screens/RecordsScreen";
import VetScreen from "../../screens/VetScreen";
import VaccinesScreen from "../../screens/VaccinesScreen";
import SettingsScreen from "../../screens/SettingsScreen";
import { useTheme } from "../../theme/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdBanner from "../../components/AdBanner";
import { Icon } from "../../components/ui/Icon";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";

export type TabsParamList = {
  Inicio: undefined;
  Registros: undefined;
  Veterinario: undefined;
  Vacunas: undefined;
  Ajustes: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

function getIconName(routeName: string, focused: boolean): string {
  switch (routeName) {
    case "Inicio":
      return focused ? "home" : "home-outline";
    case "Registros":
      return focused ? "list" : "list-outline";
    case "Veterinario":
      return focused ? "medkit" : "medkit-outline";
    case "Vacunas":
      return focused ? "shield-checkmark" : "shield-checkmark-outline";
    case "Ajustes":
      return focused ? "settings" : "settings-outline";
    default:
      return "home";
  }
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: t.bg }]}>
      {/* Tab bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: t.card,
            borderTopColor: t.border,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <AnimatedPressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              scale={0.9}
              haptic="selection"
            >
              <Icon
                name={getIconName(route.name, isFocused)}
                size={isFocused ? 24 : 22}
                color={isFocused ? t.accent : t.textMuted}
              />
            </AnimatedPressable>
          );
          
        })}
      </View>

      {/* Banner de anuncios - debajo del tab bar */}
      <View style={[styles.adWrapper, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        <AdBanner />
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Registros" component={RecordsScreen} />
      <Tab.Screen name="Veterinario" component={VetScreen} />
      <Tab.Screen name="Vacunas" component={VaccinesScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    // El contenedor del banner + tab bar
  },
  adWrapper: {
    // Banner debajo del tab bar
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});
