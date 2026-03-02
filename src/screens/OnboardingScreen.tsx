import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/useTheme';
import { useOnboarding } from '../app/state/OnboardingContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../app/navigation/AuthStack';

import { fonts } from '../theme/fonts';
interface Slide {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { completeOnboarding } = useOnboarding();
  const { width } = useWindowDimensions();

  const slides: Slide[] = [
    {
      id: '1',
      icon: '🐾',
      title: tr('onboarding.slide1Title'),
      subtitle: tr('onboarding.slide1Subtitle'),
    },
    {
      id: '2',
      icon: '📋',
      title: tr('onboarding.slide2Title'),
      subtitle: tr('onboarding.slide2Subtitle'),
    },
    {
      id: '3',
      icon: '🚀',
      title: tr('onboarding.slide3Title'),
      subtitle: tr('onboarding.slide3Subtitle'),
    },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    navigation.replace('Login');
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width }]}>
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={[styles.title, { color: t.text }]}>{item.title}</Text>
      <Text style={[styles.subtitle, { color: t.textMuted }]}>{item.subtitle}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === currentIndex ? t.accent : t.border,
            },
          ]}
        />
      ))}
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.buttonContainer}>
        {isLastSlide ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: t.accent }]}
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>{tr('onboarding.getStarted')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.skipButton]}
              onPress={handleGetStarted}
            >
              <Text style={[styles.skipText, { color: t.textMuted }]}>{tr('onboarding.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: t.accent }]}
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>{tr('onboarding.next')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 140,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
  },
});
