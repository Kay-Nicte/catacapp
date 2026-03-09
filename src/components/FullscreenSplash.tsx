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
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(12)).current;
  const sloganOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // Title slides up
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(titleTranslate, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      // Slogan fades in
      Animated.timing(sloganOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Hold
      Animated.delay(600),
      // Fade out everything
      Animated.timing(fadeAll, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAll }]}>
      <View style={styles.content}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] },
          ]}
        >
          CatacApp
        </Animated.Text>

        <Animated.Text style={[styles.slogan, { opacity: sloganOpacity }]}>
          Todo sobre tu mascota, en un solo lugar
        </Animated.Text>
      </View>

      <Animated.Text style={[styles.footer, { opacity: sloganOpacity }]}>
        by Panal
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E0F10',
    zIndex: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: 32,
  },
  title: {
    fontFamily: fonts.black,
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  slogan: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#D4621A',
    letterSpacing: 0.3,
  },
  footer: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    paddingBottom: 48,
  },
});
