import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { fonts } from '../theme/fonts';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function FullscreenSplash({ onFinish }: Props) {
  const fadeAll = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Footer fades in
      Animated.timing(footerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Hold
      Animated.delay(1200),
      // Fade out everything
      Animated.timing(fadeAll, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAll }]}>
      <View style={styles.content}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image source={require('../../assets/splash-logo.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      </View>

      <Animated.Text style={[styles.footer, { opacity: footerOpacity }]}>
        by Panal
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.65,
    height: width * 0.82,
  },
  footer: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: 'rgba(0,0,0,0.25)',
    textAlign: 'center',
    paddingBottom: 48,
  },
});
