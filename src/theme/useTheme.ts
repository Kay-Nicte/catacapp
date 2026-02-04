import { useThemeMode } from "../app/state/ThemeContext";
import { dark, light } from "./tokens";

export function useTheme() {
  const { effectiveTheme } = useThemeMode();
  return effectiveTheme === "dark" ? dark : light;
}
