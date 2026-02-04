import { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { haptics } from "../utils/haptics";

interface UseAnimatedPressOptions {
  scale?: number;
  haptic?: "light" | "medium" | "selection" | "none";
}

export function useAnimatedPress(options: UseAnimatedPressOptions = {}) {
  const { scale = 0.97, haptic = "light" } = options;
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(pressed.value ? scale : 1, {
            damping: 15,
            stiffness: 400,
          }),
        },
      ],
    };
  });

  const onPressIn = () => {
    pressed.value = true;
    if (haptic !== "none") {
      haptics[haptic]();
    }
  };

  const onPressOut = () => {
    pressed.value = false;
  };

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
  };
}

export default useAnimatedPress;
