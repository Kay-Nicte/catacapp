import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  vaccineReminders: boolean;
  vetReminders: boolean;
  // Premium: recordatorios avanzados
  reminderDaysBefore: number;   // dias de antelacion (1, 3, 7)
  reminderHour: number;         // hora del recordatorio (0-23)
  routineReminders: boolean;    // recordar rutinas diarias
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  scheduleVaccineReminder: (petName: string, vaccineName: string, date: Date) => Promise<string | null>;
  scheduleVetReminder: (petName: string, clinicName: string, date: Date) => Promise<string | null>;
  scheduleRoutineReminder: () => Promise<string | null>;
  cancelRoutineReminder: () => Promise<void>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_SETTINGS_KEY = "@catacapp_notification_settings";

const defaultSettings: NotificationSettings = {
  enabled: true,
  vaccineReminders: true,
  vetReminders: true,
  reminderDaysBefore: 1,
  reminderHour: 10,
  routineReminders: false,
};

const ROUTINE_REMINDER_ID = "catacapp_routine_daily";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [hasPermission, setHasPermission] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription>(undefined);
  const responseListener = useRef<Notifications.EventSubscription>(undefined);

  useEffect(() => {
    // Cargar configuración guardada
    loadSettings();

    // Verificar permisos existentes
    checkPermission();

    // Listeners para notificaciones
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response);
      // Aquí podrías navegar a una pantalla específica según la notificación
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!Device.isDevice) {
      console.log("Notificaciones solo funcionan en dispositivos físicos");
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === "granted";
    setHasPermission(granted);

    if (granted && Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E28B41",
      });
    }

    return granted;
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));

    // Si se desactivan las notificaciones, cancelar todas las programadas
    if (newSettings.enabled === false) {
      await cancelAllNotifications();
    }
  };

  const scheduleVaccineReminder = async (
    petName: string,
    vaccineName: string,
    date: Date
  ): Promise<string | null> => {
    if (!settings.enabled || !settings.vaccineReminders || !hasPermission) {
      return null;
    }

    const daysBefore = settings.reminderDaysBefore ?? 1;
    const hour = settings.reminderHour ?? 10;

    const reminderDate = new Date(date);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(hour, 0, 0, 0);

    // No programar si la fecha ya pasó
    if (reminderDate <= new Date()) {
      return null;
    }

    const daysLabel = daysBefore === 1 ? "Mañana" : `En ${daysBefore} días`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Vacuna de ${petName}`,
        body: `${daysLabel} toca la vacuna ${vaccineName}`,
        data: { type: "vaccine", petName, vaccineName },
        sound: true,
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminderDate },
    });

    return id;
  };

  const scheduleVetReminder = async (
    petName: string,
    clinicName: string,
    date: Date
  ): Promise<string | null> => {
    if (!settings.enabled || !settings.vetReminders || !hasPermission) {
      return null;
    }

    const daysBefore = settings.reminderDaysBefore ?? 1;
    const hour = settings.reminderHour ?? 10;

    const reminderDate = new Date(date);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(hour, 0, 0, 0);

    // No programar si la fecha ya pasó
    if (reminderDate <= new Date()) {
      return null;
    }

    const daysLabel = daysBefore === 1 ? "Mañana" : `En ${daysBefore} días`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Cita veterinaria de ${petName}`,
        body: `${daysLabel} tienes cita en ${clinicName}`,
        data: { type: "vet", petName, clinicName },
        sound: true,
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminderDate },
    });

    return id;
  };

  const scheduleRoutineReminder = async (): Promise<string | null> => {
    if (!settings.enabled || !settings.routineReminders || !hasPermission) {
      return null;
    }

    // Cancelar recordatorio anterior si existe
    await cancelRoutineReminder();

    const hour = settings.reminderHour ?? 10;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rutinas de hoy",
        body: "No olvides completar las rutinas de tus mascotas",
        data: { type: "routine" },
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });

    return id;
  };

  const cancelRoutineReminder = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === "routine") {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  };

  const cancelNotification = async (id: string) => {
    await Notifications.cancelScheduledNotificationAsync(id);
  };

  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        hasPermission,
        requestPermission,
        scheduleVaccineReminder,
        scheduleVetReminder,
        scheduleRoutineReminder,
        cancelRoutineReminder,
        cancelNotification,
        cancelAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
