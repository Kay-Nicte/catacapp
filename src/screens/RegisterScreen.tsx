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

export default function RegisterScreen() {
  const t = useTheme();
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
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    const result = await register(email, password, name);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'No se pudo crear la cuenta');
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
          <Text style={[styles.title, { color: t.text }]}>Crear cuenta</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            Regístrate para guardar tus datos en la nube
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: t.textMuted }]}>NOMBRE</Text>
            <View style={[styles.inputWrapper, { borderColor: t.border, backgroundColor: t.card }]}>
              <Icon name="person-outline" size={20} color={t.textMuted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={t.textMuted}
                autoCapitalize="words"
                style={[styles.input, { color: t.text }]}
              />
            </View>
          </View>

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
                placeholder="Mínimo 6 caracteres"
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
            <Text style={[styles.label, { color: t.textMuted }]}>CONFIRMAR CONTRASEÑA</Text>
            <View style={[styles.inputWrapper, { borderColor: t.border, backgroundColor: t.card }]}>
              <Icon name="lock-closed-outline" size={20} color={t.textMuted} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite la contraseña"
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
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </AnimatedPressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
            <Text style={[styles.dividerText, { color: t.textMuted }]}>o</Text>
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
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </>
            )}
          </AnimatedPressable>

          <Text style={[styles.terms, { color: t.textMuted }]}>
            Al crear una cuenta aceptas nuestros{' '}
            <Text style={{ color: t.accent }}>Términos de servicio</Text> y{' '}
            <Text style={{ color: t.accent }}>Política de privacidad</Text>
          </Text>

          <View style={styles.loginPrompt}>
            <Text style={[styles.loginPromptText, { color: t.textMuted }]}>
              ¿Ya tienes cuenta?{' '}
            </Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={[styles.loginLink, { color: t.accent }]}>Inicia sesión</Text>
            </Pressable>
          </View>
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
    marginVertical: 20,
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

  terms: {
    fontSize: 13,
    fontWeight: '500',
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
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
  },
});
