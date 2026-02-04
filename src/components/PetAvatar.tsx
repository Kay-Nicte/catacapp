import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { avatarMap } from "../assets/avatars";

export default function PetAvatar({
  avatarKey,
  memorial = false,
  size = 92,
}: {
  avatarKey: string;
  memorial?: boolean;
  size?: number;
}) {
  const t = useTheme();

  const src = avatarMap[avatarKey];

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderColor: t.border,
          backgroundColor: t.card,
          opacity: memorial ? 0.55 : 1,
        },
      ]}
    >
      {src ? (
        <Image source={src} style={{ width: size * 0.82, height: size * 0.82 }} resizeMode="contain" />
      ) : (
        // fallback silencioso: no peta si falta el asset
        <View style={{ width: size * 0.82, height: size * 0.82, borderRadius: 14, backgroundColor: t.bg }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
