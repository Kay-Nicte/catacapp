import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const isHapticsAvailable = Platform.OS === "ios" || Platform.OS === "android";

export const haptics = {
  light: () => {
    if (isHapticsAvailable) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },
  medium: () => {
    if (isHapticsAvailable) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },
  heavy: () => {
    if (isHapticsAvailable) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },
  success: () => {
    if (isHapticsAvailable) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  warning: () => {
    if (isHapticsAvailable) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
  error: () => {
    if (isHapticsAvailable) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },
  selection: () => {
    if (isHapticsAvailable) {
      Haptics.selectionAsync();
    }
  },
};

export default haptics;
