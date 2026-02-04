export const light = {
  bg: "#F6F1E9",
  card: "#FFFFFF",
  text: "#1C1C1C",
  textMuted: "#6B6B6B",
  border: "rgba(0,0,0,0.08)",
  accent: "#E28B41",
  accentSoft: "rgba(226,139,65,0.15)",
  danger: "#D64545",
};

export const dark = {
  bg: "#0E0F10",
  card: "#16181A",
  text: "#F2F2F2",
  textMuted: "#A7A7A7",
  border: "rgba(255,255,255,0.10)",
  accent: "#E28B41",
  accentSoft: "rgba(226,139,65,0.18)",
  danger: "#FF6B6B",
};

// Shadows for different elevations
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: "#E28B41",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Typography settings
export const typography = {
  fontFamily: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semiBold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extraBold: "Inter_800ExtraBold",
    black: "Inter_900Black",
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
  },
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
};

// Border radius scale
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  "2xl": 24,
  full: 9999,
};
