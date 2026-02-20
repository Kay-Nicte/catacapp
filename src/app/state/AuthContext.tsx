import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import i18n from "../../i18n";
import { getUserDoc, createUserDoc } from "../../services/firestore";

// ⚠️ IMPORTANTE: Reemplaza esto con tu Web Client ID de Firebase Console
// Lo encuentras en: Firebase Console → Configuración → Tus apps → Configuración del SDK
const WEB_CLIENT_ID = "600979458540-31hmcfi0avmp2t63h7peo9jk7qoi960i.apps.googleusercontent.com";

// Configurar Google Sign-In
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
});

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  provider?: "email" | "google";
  avatarUrl?: string;
}

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
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(firebaseUser: FirebaseAuthTypes.User): User {
  const providerData = firebaseUser.providerData[0];
  const isGoogle = providerData?.providerId === "google.com";

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
    provider: isGoogle ? "google" : "email",
    avatarUrl: firebaseUser.photoURL || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Escuchar cambios de autenticación (persistencia automática)
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));

        // Ensure Firestore user doc exists (creates household if needed)
        try {
          const userDoc = await getUserDoc(firebaseUser.uid);
          if (!userDoc) {
            await createUserDoc(
              firebaseUser.uid,
              firebaseUser.email || ""
            );
          }
        } catch (error) {
          console.error("Error ensuring user doc:", error);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail || !password) {
        return { success: false, error: i18n.t('auth.errors.fillAllFields') };
      }

      await auth().signInWithEmailAndPassword(normalizedEmail, password);
      return { success: true };
    } catch (error: any) {
      let message = i18n.t('auth.errors.loginError');

      switch (error.code) {
        case "auth/invalid-email":
          message = i18n.t('auth.errors.invalidEmail');
          break;
        case "auth/user-disabled":
          message = i18n.t('auth.errors.accountDisabled');
          break;
        case "auth/user-not-found":
          message = i18n.t('auth.errors.noAccount');
          break;
        case "auth/wrong-password":
          message = i18n.t('auth.errors.wrongPassword');
          break;
        case "auth/invalid-credential":
          message = i18n.t('auth.errors.invalidCredentials');
          break;
        case "auth/too-many-requests":
          message = i18n.t('auth.errors.tooManyAttempts');
          break;
      }

      return { success: false, error: message };
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

      if (!normalizedEmail || !password || !trimmedName) {
        return { success: false, error: i18n.t('auth.errors.fillAllFields') };
      }

      if (!normalizedEmail.includes("@")) {
        return { success: false, error: i18n.t('auth.errors.invalidEmail') };
      }

      if (password.length < 6) {
        return {
          success: false,
          error: i18n.t('auth.errors.passwordMinLength'),
        };
      }

      // Crear usuario en Firebase
      const credential = await auth().createUserWithEmailAndPassword(
        normalizedEmail,
        password
      );

      // Actualizar el nombre del perfil
      await credential.user.updateProfile({
        displayName: trimmedName,
      });

      // Refrescar el usuario para obtener el nombre actualizado
      await credential.user.reload();

      return { success: true };
    } catch (error: any) {
      let message = i18n.t('auth.errors.registerError');

      switch (error.code) {
        case "auth/email-already-in-use":
          message = i18n.t('auth.errors.emailInUse');
          break;
        case "auth/invalid-email":
          message = i18n.t('auth.errors.invalidEmail');
          break;
        case "auth/weak-password":
          message = i18n.t('auth.errors.weakPassword');
          break;
      }

      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      // Verificar que Google Play Services está disponible
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Iniciar sesión con Google
      const signInResult = await GoogleSignin.signIn();

      // v16+: cancel returns { type: 'cancelled' } instead of throwing
      if (signInResult.type === 'cancelled') {
        return { success: false, error: i18n.t('auth.errors.googleCancelled') };
      }

      // Obtener el token de ID
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        return { success: false, error: i18n.t('auth.errors.googleTokenError') };
      }

      // Crear credencial de Firebase con el token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Iniciar sesión en Firebase
      await auth().signInWithCredential(googleCredential);

      return { success: true };
    } catch (error: any) {
      let message = i18n.t('auth.errors.googleError');

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        message = i18n.t('auth.errors.googleCancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        message = i18n.t('auth.errors.googleInProgress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        message = i18n.t('auth.errors.googlePlayNotAvailable');
      } else {
        // Show real error details for debugging
        const code = error.code || 'unknown';
        const msg = error.message || String(error);
        message = `${i18n.t('auth.errors.googleError')}\n\n[${code}] ${msg}`;
      }

      console.error("Google Sign-In error:", error);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // Si estaba logueado con Google, desconectar también de Google
      const currentUser = auth().currentUser;
      if (currentUser) {
        const isGoogleUser = currentUser.providerData.some(
          (p) => p.providerId === "google.com"
        );
        if (isGoogleUser) {
          await GoogleSignin.signOut();
        }
      }

      await auth().signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      if (updates.name) {
        await currentUser.updateProfile({
          displayName: updates.name,
        });
      }

      if (updates.avatarUrl) {
        await currentUser.updateProfile({
          photoURL: updates.avatarUrl,
        });
      }

      // Refrescar para obtener datos actualizados
      await currentUser.reload();

      // Actualizar estado local
      const refreshedUser = auth().currentUser;
      if (refreshedUser) {
        setUser(mapFirebaseUser(refreshedUser));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail) {
        return { success: false, error: i18n.t('auth.errors.enterEmail') };
      }

      await auth().sendPasswordResetEmail(normalizedEmail);
      return { success: true };
    } catch (error: any) {
      let message = i18n.t('auth.errors.resetError');

      switch (error.code) {
        case "auth/invalid-email":
          message = i18n.t('auth.errors.invalidEmail');
          break;
        case "auth/user-not-found":
          message = i18n.t('auth.errors.noAccount');
          break;
      }

      return { success: false, error: message };
    }
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
        logout,
        updateProfile,
        resetPassword,
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
