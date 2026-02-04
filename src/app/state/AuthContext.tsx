import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

// Este URI DEBE estar en Google Cloud Console > Web Client ID > Authorized redirect URIs
const EXPO_REDIRECT_URI = "https://auth.expo.io/@kay-nicte/catacapp";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  provider?: "email" | "google";
  avatarUrl?: string;
}

// Client IDs de Google Cloud Console
// Obtén tus Client IDs en: https://console.cloud.google.com/apis/credentials
const GOOGLE_WEB_CLIENT_ID =
  "783077069369-8gl5bf0et5fuivaupbk325dqgubbkbbg.apps.googleusercontent.com";

// Android Client ID - REEMPLAZAR con el ID generado en Google Cloud Console
// Pasos: Credenciales → Crear ID de cliente OAuth → Android → usar package: com.catacapp.app y el SHA-1 del keystore
const GOOGLE_ANDROID_CLIENT_ID = "783077069369-h3534monc36gj9pabhd04gq686pmit28.apps.googleusercontent.com";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  promptGoogleAsync: (() => Promise<any>) | null;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@catacapp_auth";

// Simulación de base de datos de usuarios (en producción usar Firebase/Supabase)
const USERS_STORAGE_KEY = "@catacapp_users";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Google Auth usando el proxy de Expo
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: EXPO_REDIRECT_URI,
  });

  // Debug: mostrar URL de autenticación
  useEffect(() => {
    if (request) {
      console.log("=== GOOGLE OAUTH DEBUG ===");
      console.log("Redirect URI:", EXPO_REDIRECT_URI);
      console.log("Web Client ID:", GOOGLE_WEB_CLIENT_ID);
      console.log("Request URL:", request.url);
      console.log("==========================");
    }
  }, [request]);

  // Cargar sesión al iniciar
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Manejar respuesta de Google OAuth
  useEffect(() => {
    console.log("Google OAuth response:", JSON.stringify(response, null, 2));
    if (response?.type === "success") {
      handleGoogleResponse(response.authentication?.accessToken);
    } else if (response?.type === "error") {
      console.error("Google OAuth error:", response.error);
    }
  }, [response]);

  const loadStoredAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
      }
    } catch (error) {
      console.error("Error loading auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStoredUsers = async (): Promise<
    Record<string, { user: User; password: string }>
  > => {
    try {
      const stored = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveStoredUsers = async (
    users: Record<string, { user: User; password: string }>
  ) => {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Validación básica
      if (!normalizedEmail || !password) {
        return { success: false, error: "Completa todos los campos" };
      }

      const users = await getStoredUsers();
      const userData = users[normalizedEmail];

      if (!userData) {
        return { success: false, error: "No existe una cuenta con este email" };
      }

      if (userData.password !== password) {
        return { success: false, error: "Contraseña incorrecta" };
      }

      // Guardar sesión
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(userData.user)
      );
      setUser(userData.user);

      return { success: true };
    } catch (error) {
      return { success: false, error: "Error al iniciar sesión" };
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const trimmedName = name.trim();

      // Validaciones
      if (!normalizedEmail || !password || !trimmedName) {
        return { success: false, error: "Completa todos los campos" };
      }

      if (!normalizedEmail.includes("@")) {
        return { success: false, error: "Email no válido" };
      }

      if (password.length < 6) {
        return {
          success: false,
          error: "La contraseña debe tener al menos 6 caracteres",
        };
      }

      const users = await getStoredUsers();

      if (users[normalizedEmail]) {
        return { success: false, error: "Ya existe una cuenta con este email" };
      }

      // Crear usuario
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        email: normalizedEmail,
        name: trimmedName,
        createdAt: new Date().toISOString(),
      };

      // Guardar en "base de datos"
      users[normalizedEmail] = { user: newUser, password };
      await saveStoredUsers(users);

      // Guardar sesión
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);

      return { success: true };
    } catch (error) {
      return { success: false, error: "Error al crear la cuenta" };
    }
  };

  const handleGoogleResponse = async (accessToken: string | undefined) => {
    if (!accessToken) return;

    try {
      // Obtener información del usuario de Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const googleUser = await userInfoResponse.json();

      const normalizedEmail = googleUser.email.toLowerCase().trim();
      const users = await getStoredUsers();

      let existingUser = users[normalizedEmail]?.user;

      if (existingUser) {
        // Usuario existente - actualizar provider si es necesario
        existingUser = {
          ...existingUser,
          provider: "google",
          avatarUrl: googleUser.picture,
        };
        users[normalizedEmail].user = existingUser;
        await saveStoredUsers(users);
        await AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify(existingUser)
        );
        setUser(existingUser);
      } else {
        // Crear nuevo usuario con Google
        const newUser: User = {
          id: `google_${googleUser.id}`,
          email: normalizedEmail,
          name: googleUser.name || googleUser.email.split("@")[0],
          createdAt: new Date().toISOString(),
          provider: "google",
          avatarUrl: googleUser.picture,
        };

        users[normalizedEmail] = { user: newUser, password: "" };
        await saveStoredUsers(users);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
      }
    } catch (error) {
      console.error("Error processing Google login:", error);
    }
  };

  const loginWithGoogle = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      if (!request) {
        return {
          success: false,
          error: "Google Sign-In no está configurado. Verifica el Client ID.",
        };
      }

      const result = await promptAsync();

      if (result?.type === "success") {
        return { success: true };
      } else if (result?.type === "cancel") {
        return { success: false, error: "Inicio de sesión cancelado" };
      } else {
        return { success: false, error: "Error al iniciar sesión con Google" };
      }
    } catch (error) {
      return { success: false, error: "Error al conectar con Google" };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };

    // Actualizar en storage
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));

    // Actualizar en "base de datos"
    const users = await getStoredUsers();
    if (users[user.email]) {
      users[user.email].user = updatedUser;
      await saveStoredUsers(users);
    }

    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        promptGoogleAsync: request ? promptAsync : null,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
