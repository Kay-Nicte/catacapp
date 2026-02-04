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
import { Icon } from '../components/ui/Icon';
import { AnimatedPressable } from '../components/ui/AnimatedPressable';
import { useTheme } from '../theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../app/state/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../app/navigation/AuthStack';
import { Image } from 'react-native';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const GOOGLE_ICON = 'https://developers.google.com/identity/images/g-logo.png';

export default function LoginScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    const result = await loginWithGoogle();
    setIsGoogleLoading(false);

    if (!result.success && result.error !== 'Inicio de sesión cancelado') {
      Alert.alert('Error', result.error || 'No se pudo iniciar sesión con Google');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={48} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: t.text }]}>CatacApp</Text>
          <Text style={[styles.tagline, { color: t.textMuted }]}>
            Cuida de tus mascotas con amor
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={[styles.title, { color: t.text }]}>Iniciar sesión</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            Accede a tu cuenta para sincronizar tus datos
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: t.textMuted }]}>EMAIL</Text>
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
            <Text style={[styles.label, { color: t.textMuted }]}>CONTRASEÑA</Text>
            <View style={[styles.inputWrapper, { borderColor: t.border, backgroundColor: t.card }]}>
              <Icon name="lock-closed-outline" size={20} color={t.textMuted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
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

          <AnimatedPressable
            onPress={handleLogin}
            disabled={isLoading}
            style={[styles.button, { backgroundColor: t.accent, opacity: isLoading ? 0.7 : 1 }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </AnimatedPressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
            <Text style={[styles.dividerText, { color: t.textMuted }]}>o</Text>
            <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
          </View>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
            style={[styles.googleButton, { backgroundColor: '#fff', borderColor: t.border, opacity: isGoogleLoading ? 0.7 : 1 }]}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <Image source={{ uri: GOOGLE_ICON }} style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Register')}
            style={[styles.secondaryButton, { borderColor: t.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: t.text }]}>Crear cuenta nueva</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },

  formSection: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 32,
  },

  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
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
    fontWeight: '600',
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
    fontWeight: '800',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },

  googleButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  secondaryButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
