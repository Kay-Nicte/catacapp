import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

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
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
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
        return { success: false, error: "Completa todos los campos" };
      }

      await auth().signInWithEmailAndPassword(normalizedEmail, password);
      return { success: true };
    } catch (error: any) {
      let message = "Error al iniciar sesión";

      switch (error.code) {
        case "auth/invalid-email":
          message = "Email no válido";
          break;
        case "auth/user-disabled":
          message = "Esta cuenta ha sido deshabilitada";
          break;
        case "auth/user-not-found":
          message = "No existe una cuenta con este email";
          break;
        case "auth/wrong-password":
          message = "Contraseña incorrecta";
          break;
        case "auth/invalid-credential":
          message = "Email o contraseña incorrectos";
          break;
        case "auth/too-many-requests":
          message = "Demasiados intentos. Espera unos minutos";
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
      let message = "Error al crear la cuenta";

      switch (error.code) {
        case "auth/email-already-in-use":
          message = "Ya existe una cuenta con este email";
          break;
        case "auth/invalid-email":
          message = "Email no válido";
          break;
        case "auth/weak-password":
          message = "La contraseña es demasiado débil";
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

      // Obtener el token de ID
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        return { success: false, error: "No se pudo obtener el token de Google" };
      }

      // Crear credencial de Firebase con el token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Iniciar sesión en Firebase
      await auth().signInWithCredential(googleCredential);

      return { success: true };
    } catch (error: any) {
      let message = "Error al iniciar sesión con Google";

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        message = "Inicio de sesión cancelado";
      } else if (error.code === statusCodes.IN_PROGRESS) {
        message = "Inicio de sesión en progreso";
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        message = "Google Play Services no disponible";
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
        return { success: false, error: "Ingresa tu email" };
      }

      await auth().sendPasswordResetEmail(normalizedEmail);
      return { success: true };
    } catch (error: any) {
      let message = "Error al enviar el correo";

      switch (error.code) {
        case "auth/invalid-email":
          message = "Email no válido";
          break;
        case "auth/user-not-found":
          message = "No existe una cuenta con este email";
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
