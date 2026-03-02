import React from 'react';
import { View, useWindowDimensions } from 'react-native';

const MAX_WIDTH = 700;

interface ScreenContainerProps {
  children: React.ReactNode;
}

export default function ScreenContainer({ children }: ScreenContainerProps) {
  const { width } = useWindowDimensions();

  if (width <= MAX_WIDTH) {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center' }}>
      {children}
    </View>
  );
}
