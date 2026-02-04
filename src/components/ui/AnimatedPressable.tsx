import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useAnimatedPress } from "../../hooks/useAnimatedPress";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  scale?: number;
  haptic?: "light" | "medium" | "selection" | "none";
  children?: React.ReactNode;
}

export function AnimatedPressable({
  style,
  scale = 0.97,
  haptic = "light",
  onPressIn: externalOnPressIn,
  onPressOut: externalOnPressOut,
  children,
  ...props
}: AnimatedPressableProps) {
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress({
    scale,
    haptic,
  });

  const handlePressIn = (event: any) => {
    onPressIn();
    externalOnPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    onPressOut();
    externalOnPressOut?.(event);
  };

  return (
    <AnimatedPressableBase
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}

export default AnimatedPressable;
