import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Icon } from '../components/ui/Icon';
import { AnimatedPressable } from '../components/ui/AnimatedPressable';
import { useTheme } from '../theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../app/state/AuthContext';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '../components/layout/ScreenContainer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../app/navigation/AuthStack';
import { Image } from 'react-native';

import { fonts } from '../theme/fonts';
type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const GOOGLE_ICON = 'https://developers.google.com/identity/images/g-logo.png';

export default function RegisterScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { register, loginWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleRegister = async () => {
    if (isLoading) return;

    if (password !== confirmPassword) {
      Alert.alert(tr('common.error'), tr('auth.passwordMismatch'));
      return;
    }

    setIsLoading(true);
    const result = await register(email, password, name);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert(tr('common.error'), result.error || tr('auth.registerFailed'));
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    const result = await loginWithGoogle();
    setIsGoogleLoading(false);

    if (!result.success && result.error !== i18n.t('auth.errors.googleCancelled')) {
      Alert.alert(tr('common.error'), result.error || tr('auth.googleFailed'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: t.card, borderColor: t.border }]}
            hitSlop={10}
          >
            <Icon name="arrow-back" size={22} color={t.text} />
          </AnimatedPressable>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={[styles.title, { color: t.text }]}>{tr('auth.registerTitle')}</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {tr('auth.registerSubtitle')}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: t.textMuted }]}>{tr('auth.nameLabel')}</Text>
            <View style={[styles.inputWrapper, { borderColor: t.border, backgroundColor: t.card }]}>
              <Icon name="person-outline" size={20} color={t.textMuted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={tr('auth.namePlaceholder')}
                placeholderTextColor={t.textMuted}
                autoCapitalize="words"
                style={[styles.input, { color: t.text }]}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: t.textMuted }]}>{tr('auth.emailLabel')}</Text>
            <View style={[styles.inputWrapper, { borderColor: t.border, backgroundColor: t.card }]}>
              <Icon name="mail-outline" size={20} color={t.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={t.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: t.text }]}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: t.textMuted }]}>{tr('auth.passwordLabel')}</Text>
            <View style={[styles.inputWrapper, { borderColor: t.border, backgroundColor: t.card }]}>
              <Icon name="lock-closed-outline" size={20} color={t.textMuted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={tr('auth.passwordPlaceholder')}
                placeholderTextColor={t.textMuted}
                secureTextEntry={!showPassword}
                style={[styles.input, { color: t.text }]}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={t.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: t.textMuted }]}>{tr('auth.confirmPasswordLabel')}</Text>
            <View style={[styles.inputWrapper, { borderColor: t.border, backgroundColor: t.card }]}>
              <Icon name="lock-closed-outline" size={20} color={t.textMuted} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={tr('auth.confirmPasswordPlaceholder')}
                placeholderTextColor={t.textMuted}
                secureTextEntry={!showPassword}
                style={[styles.input, { color: t.text }]}
              />
            </View>
          </View>

          <AnimatedPressable
            onPress={handleRegister}
            disabled={isLoading}
            style={[styles.button, { backgroundColor: t.accent, opacity: isLoading ? 0.7 : 1 }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{tr('auth.registerButton')}</Text>
            )}
          </AnimatedPressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
            <Text style={[styles.dividerText, { color: t.textMuted }]}>{tr('common.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
          </View>

          <AnimatedPressable
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
            style={[styles.googleButton, { backgroundColor: '#fff', borderColor: t.border, opacity: isGoogleLoading ? 0.7 : 1 }]}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <Image source={{ uri: GOOGLE_ICON }} style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>{tr('auth.continueGoogle')}</Text>
              </>
            )}
          </AnimatedPressable>

          <Text style={[styles.terms, { color: t.textMuted }]}>
            {tr('auth.termsText')}
            <Text style={{ color: t.accent }}>{tr('auth.termsOfService')}</Text>{tr('auth.and')}
            <Text style={{ color: t.accent }}>{tr('auth.privacyPolicy')}</Text>
          </Text>

          <View style={styles.loginPrompt}>
            <Text style={[styles.loginPromptText, { color: t.textMuted }]}>
              {tr('auth.alreadyHaveAccount')}
            </Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={[styles.loginLink, { color: t.accent }]}>{tr('auth.signIn')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formSection: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    marginBottom: 32,
  },

  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.black,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },

  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: fonts.extraBold,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },

  googleButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#333',
  },

  terms: {
    fontSize: 13,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },

  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginPromptText: {
    fontSize: 15,
    fontFamily: fonts.medium,
  },
  loginLink: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
