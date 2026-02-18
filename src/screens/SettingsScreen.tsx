import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Modal,
} from "react-native";
import * as Notifications from "expo-notifications";
import { File as FSFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useTheme } from "../theme/useTheme";
import { shadows } from "../theme/tokens";
import { useThemeMode, ThemeMode } from "../app/state/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../app/state/AuthContext";
import { usePremium } from "../app/state/PremiumContext";
import { useNotifications } from "../app/state/NotificationContext";
import { useAds } from "../app/state/AdsContext";
import { usePet } from "../app/state/PetContext";
import { useRecords } from "../app/state/RecordsContext";
import { useVet } from "../app/state/VetContext";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";

interface SettingRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  locked?: boolean;
}

function SettingRow({ icon, title, subtitle, onPress, rightElement, danger, locked }: SettingRowProps) {
  const t = useTheme();

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      style={[
        styles.settingRow,
        { backgroundColor: t.card },
      ]}
      haptic={onPress ? "light" : "none"}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? "rgba(214,69,69,0.15)" : t.accentSoft }]}>
        <Icon name={icon} size={20} color={danger ? t.danger : t.accent} />
      </View>

      <View style={styles.settingContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.settingTitle, { color: danger ? t.danger : t.text }]}>{title}</Text>
          {locked && (
            <View style={[styles.premiumBadge, { backgroundColor: t.accentSoft }]}>
              <Icon name="diamond" size={12} color={t.accent} />
              <Text style={[styles.premiumBadgeText, { color: t.accent }]}>Premium</Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: t.textMuted }]}>{subtitle}</Text>
        )}
      </View>

      {rightElement || (onPress && <Icon name="chevron-forward" size={20} color={t.textMuted} />)}
    </AnimatedPressable>
  );
}

const themeModeLabels: Record<ThemeMode, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

export default function SettingsScreen() {
  const t = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { isPremium, cancelSubscription, status: premiumStatus } = usePremium();
  const { settings: notificationSettings, updateSettings, hasPermission, requestPermission, scheduleRoutineReminder, cancelRoutineReminder } = useNotifications();
  const { showInterstitial, showAds } = useAds();
  const { pets } = usePet();
  const { records, routines } = useRecords();
  const { visits } = useVet();
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const handleToggleNotifications = async (value: boolean) => {
    if (value && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permisos necesarios",
          "Para recibir notificaciones, debes permitir el acceso en los ajustes de tu dispositivo."
        );
        return;
      }
    }
    await updateSettings({ enabled: value });
  };

  const handleToggleVaccineReminders = async (value: boolean) => {
    await updateSettings({ vaccineReminders: value });
  };

  const handleToggleVetReminders = async (value: boolean) => {
    await updateSettings({ vetReminders: value });
  };

  const handleChangeReminderDays = () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    const options = [
      { text: "1 día antes", value: 1 },
      { text: "3 días antes", value: 3 },
      { text: "7 días antes", value: 7 },
    ];
    Alert.alert(
      "Días de antelación",
      "¿Con cuántos días de antelación quieres recibir recordatorios?",
      [
        ...options.map(opt => ({
          text: opt.text + (notificationSettings.reminderDaysBefore === opt.value ? " ✓" : ""),
          onPress: () => updateSettings({ reminderDaysBefore: opt.value }),
        })),
        { text: "Cancelar", style: "cancel" as const },
      ]
    );
  };

  const handleChangeReminderHour = () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    const options = [
      { text: "8:00 AM", value: 8 },
      { text: "10:00 AM", value: 10 },
      { text: "12:00 PM", value: 12 },
      { text: "6:00 PM", value: 18 },
    ];
    Alert.alert(
      "Hora del recordatorio",
      "¿A qué hora prefieres recibir los recordatorios?",
      [
        ...options.map(opt => ({
          text: opt.text + (notificationSettings.reminderHour === opt.value ? " ✓" : ""),
          onPress: () => updateSettings({ reminderHour: opt.value }),
        })),
        { text: "Cancelar", style: "cancel" as const },
      ]
    );
  };

  const handleToggleRoutineReminders = async (value: boolean) => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    await updateSettings({ routineReminders: value });
    if (value) {
      await scheduleRoutineReminder();
    } else {
      await cancelRoutineReminder();
    }
  };

  const handleExportData = () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    Alert.alert(
      "Exportar datos",
      "Se generará un archivo CSV con todos los datos de tus mascotas. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Exportar", onPress: doExportCSV },
      ]
    );
  };

  const doExportCSV = async () => {
    try {
      let csv = "=== MASCOTAS ===\n";
      csv += "Nombre,Tipo,Estado,Fecha nacimiento\n";
      pets.forEach(p => {
        csv += `"${p.name}","${p.type}","${p.status}","${p.birthDate || ""}"\n`;
      });

      csv += "\n=== REGISTROS ===\n";
      csv += "Mascota,Tipo,Titulo,Valor,Fecha,Fuente\n";
      records.forEach(r => {
        const pet = pets.find(p => p.id === r.petId);
        csv += `"${pet?.name || ""}","${r.type}","${r.title}","${r.value}","${r.timestamp}","${r.source}"\n`;
      });

      csv += "\n=== RUTINAS ===\n";
      csv += "Mascota,Tipo,Titulo,Hora,Activa\n";
      routines.forEach(r => {
        const pet = pets.find(p => p.id === r.petId);
        csv += `"${pet?.name || ""}","${r.type}","${r.title}","${r.time}","${r.active}"\n`;
      });

      csv += "\n=== VISITAS VETERINARIAS ===\n";
      csv += "Mascota,Tipo,Fecha,Veterinario,Motivo,Notas\n";
      visits.forEach(v => {
        const pet = pets.find(p => p.id === v.petId);
        csv += `"${pet?.name || ""}","${v.type}","${v.date}","${v.veterinarian}","${v.reason}","${v.notes}"\n`;
      });

      const file = new FSFile(Paths.cache, "catacapp_export.csv");
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Exportar datos CatacApp" });
    } catch (error) {
      Alert.alert("Error", "No se pudieron exportar los datos. Inténtalo de nuevo.");
    }
  };

  const handleCreateBackup = async () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    Alert.alert(
      "Crear backup",
      "Se generará un archivo con todos tus datos que podrás guardar en Google Drive, iCloud u otro servicio. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Crear backup", onPress: doCreateBackup },
      ]
    );
  };

  const doCreateBackup = async () => {
    try {
      const backup = {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        user: { name: user?.name, email: user?.email },
        data: {
          pets,
          records,
          routines,
          vetVisits: visits,
        },
      };

      const json = JSON.stringify(backup, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      const file = new FSFile(Paths.cache, `catacapp_backup_${date}.json`);
      file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Backup CatacApp" });
    } catch (error) {
      Alert.alert("Error", "No se pudo crear el backup. Inténtalo de nuevo.");
    }
  };

  const handleViewCharts = () => {
    (navigation as any).navigate("Charts");
  };

  const handleClearData = () => {
    Alert.alert(
      "Borrar todos los datos",
      "¿Estás seguro? Esta acción eliminará permanentemente todos los datos de la aplicación. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar todo",
          style: "destructive",
          onPress: () => {
            Alert.alert("Datos borrados", "Todos los datos han sido eliminados. (Simulado)");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    (navigation as any).navigate("Premium");
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancelar suscripción",
      "¿Estás seguro de que quieres cancelar tu suscripción Premium? Perderás acceso a todas las funciones premium.",
      [
        { text: "No, mantener", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            const result = await cancelSubscription();
            if (result.success) {
              Alert.alert("Suscripción cancelada", "Tu suscripción ha sido cancelada. Gracias por haber sido Premium.");
            } else {
              Alert.alert("Error", result.error || "No se pudo cancelar la suscripción");
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:soporte@catacapp.com?subject=Soporte%20CatacApp");
  };

  const handlePrivacyPolicy = () => {
    setPrivacyVisible(true);
  };

  // TEST: Enviar notificación de prueba inmediata
  const handleTestNotification = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert("Permisos necesarios", "Debes permitir notificaciones para probar esta función.");
        return;
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Notificación de prueba",
        body: "¡Las notificaciones funcionan correctamente!",
        sound: true,
      },
      trigger: null, // null = inmediata
    });

    Alert.alert("Enviada", "Se ha enviado una notificación de prueba.");
  };

  // TEST: Mostrar intersticial de prueba
  const handleTestInterstitial = () => {
    if (!showAds) {
      Alert.alert("Premium activo", "Los anuncios están desactivados porque tienes Premium.");
      return;
    }
    showInterstitial();
    Alert.alert("Intersticial", "Si el anuncio estaba cargado, debería haberse mostrado. Si no apareció, espera unos segundos y vuelve a intentarlo.");
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: t.text }]}>Ajustes</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cuenta */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>CUENTA</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
          <View style={styles.accountRow}>
            <View style={[styles.avatarCircle, { backgroundColor: t.accentSoft }]}>
              <Icon name="person" size={24} color={t.accent} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: t.text }]}>{user?.name || "Usuario"}</Text>
              <Text style={[styles.accountEmail, { color: t.textMuted }]}>{user?.email}</Text>
            </View>
            {isPremium && (
              <View style={[styles.premiumChip, { backgroundColor: t.accent }]}>
                <Icon name="diamond" size={14} color="#fff" />
                <Text style={styles.premiumChipText}>Premium</Text>
              </View>
            )}
          </View>
        </View>

        {/* Premium */}
        {!isPremium && (
          <>
            <AnimatedPressable
              onPress={handleManageSubscription}
              style={[styles.premiumBanner, { backgroundColor: t.accent, ...shadows.accent }]}
            >
              <View style={styles.premiumBannerContent}>
                <Icon name="diamond" size={28} color="#fff" />
                <View style={styles.premiumBannerText}>
                  <Text style={styles.premiumBannerTitle}>Hazte Premium</Text>
                  <Text style={styles.premiumBannerSubtitle}>
                    Desbloquea gráficos, exportación y más
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={24} color="#fff" />
            </AnimatedPressable>
          </>
        )}

        {isPremium && (
          <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <SettingRow
              icon="diamond"
              title="Plan Premium"
              subtitle={premiumStatus.plan === 'lifetime' ? 'De por vida' :
                       premiumStatus.plan === 'yearly' ? 'Anual' :
                       premiumStatus.plan === 'monthly' ? 'Mensual' : 'Activo'}
              onPress={handleManageSubscription}
            />
            <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
            <SettingRow
              icon="close-circle"
              title="Cancelar suscripción"
              subtitle="Volver al plan gratuito"
              onPress={handleCancelSubscription}
              danger
            />
          </View>
        )}

        {/* Apariencia */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>APARIENCIA</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: t.accentSoft }]}>
              <Icon name="color-palette" size={20} color={t.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: t.text }]}>Tema</Text>
              <Text style={[styles.settingSubtitle, { color: t.textMuted }]}>
                Elige cómo se ve la app
              </Text>
            </View>
          </View>
          <View style={styles.themeSelector}>
            {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
              <AnimatedPressable
                key={mode}
                onPress={() => setThemeMode(mode)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === mode ? t.accentSoft : "transparent",
                    borderColor: themeMode === mode ? t.accent : t.border,
                  },
                ]}
                haptic="selection"
              >
                <Icon
                  name={mode === "system" ? "phone-portrait" : mode === "light" ? "sunny" : "moon"}
                  size={18}
                  color={themeMode === mode ? t.accent : t.textMuted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: themeMode === mode ? t.accent : t.textMuted },
                  ]}
                >
                  {themeModeLabels[mode]}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Notificaciones */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>NOTIFICACIONES</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <SettingRow
            icon="notifications"
            title="Notificaciones"
            subtitle="Activar todas las notificaciones"
            rightElement={
              <Switch
                value={notificationSettings.enabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: t.border, true: t.accentSoft }}
                thumbColor={notificationSettings.enabled ? t.accent : t.textMuted}
              />
            }
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="shield-checkmark"
            title="Recordatorios de vacunas"
            subtitle="Notificar próximas vacunas"
            rightElement={
              <Switch
                value={notificationSettings.vaccineReminders && notificationSettings.enabled}
                onValueChange={handleToggleVaccineReminders}
                disabled={!notificationSettings.enabled}
                trackColor={{ false: t.border, true: t.accentSoft }}
                thumbColor={notificationSettings.vaccineReminders && notificationSettings.enabled ? t.accent : t.textMuted}
              />
            }
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="medkit"
            title="Citas veterinarias"
            subtitle="Notificar próximas citas"
            rightElement={
              <Switch
                value={notificationSettings.vetReminders && notificationSettings.enabled}
                onValueChange={handleToggleVetReminders}
                disabled={!notificationSettings.enabled}
                trackColor={{ false: t.border, true: t.accentSoft }}
                thumbColor={notificationSettings.vetReminders && notificationSettings.enabled ? t.accent : t.textMuted}
              />
            }
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="time"
            title="Días de antelación"
            subtitle={`${notificationSettings.reminderDaysBefore ?? 1} día${(notificationSettings.reminderDaysBefore ?? 1) > 1 ? "s" : ""} antes`}
            onPress={handleChangeReminderDays}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="alarm"
            title="Hora del recordatorio"
            subtitle={`${(notificationSettings.reminderHour ?? 10).toString().padStart(2, "0")}:00`}
            onPress={handleChangeReminderHour}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="refresh"
            title="Recordar rutinas diarias"
            subtitle="Notificación diaria para completar rutinas"
            locked={!isPremium}
            rightElement={
              <Switch
                value={notificationSettings.routineReminders && notificationSettings.enabled && isPremium}
                onValueChange={handleToggleRoutineReminders}
                disabled={!notificationSettings.enabled}
                trackColor={{ false: t.border, true: t.accentSoft }}
                thumbColor={notificationSettings.routineReminders && notificationSettings.enabled && isPremium ? t.accent : t.textMuted}
              />
            }
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="flask"
            title="Probar notificación"
            subtitle="Enviar notificación de prueba"
            onPress={handleTestNotification}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="tv"
            title="Probar intersticial"
            subtitle="Mostrar anuncio intersticial"
            onPress={handleTestInterstitial}
          />
        </View>

        {/* Más opciones */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>MÁS OPCIONES</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <SettingRow
            icon="stats-chart"
            title="Gráficos"
            onPress={handleViewCharts}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="download"
            title="Exportar datos"
            subtitle="Generar archivo CSV"
            onPress={handleExportData}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="cloud-upload"
            title="Crear backup"
            subtitle="Guardar copia de seguridad"
            onPress={handleCreateBackup}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="mail"
            title="Contactar soporte"
            onPress={handleContactSupport}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="document-text"
            title="Política de privacidad"
            onPress={handlePrivacyPolicy}
          />
        </View>

        {/* Zona de peligro */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>ZONA DE PELIGRO</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <SettingRow
            icon="trash"
            title="Borrar todos los datos"
            onPress={handleClearData}
            danger
          />
        </View>

        {/* Cerrar sesión */}
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, marginTop: 20 }]}>
          <SettingRow
            icon="log-out"
            title="Cerrar sesión"
            onPress={handleLogout}
            danger
          />
        </View>

        {/* Versión */}
        <Text style={[styles.versionText, { color: t.textMuted }]}>
          CatacApp v1.0.0
        </Text>
      </ScrollView>

      {/* Modal de Política de Privacidad */}
      <Modal
        visible={privacyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <Pressable style={styles.privacyBackdrop} onPress={() => setPrivacyVisible(false)} />
        <View
          style={[
            styles.privacyCard,
            { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom + 14 },
          ]}
        >
          <View style={styles.privacyHeader}>
            <Text style={[styles.privacyTitle, { color: t.text }]}>Política de privacidad</Text>
            <AnimatedPressable onPress={() => setPrivacyVisible(false)} hitSlop={10}>
              <Icon name="close" size={24} color={t.textMuted} />
            </AnimatedPressable>
          </View>

          <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.privacyDate, { color: t.textMuted }]}>
              Última actualización: 18 de febrero de 2026
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              1. Datos que recopilamos
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              CatacApp recopila únicamente la información que proporcionas voluntariamente: nombre de usuario, datos de tus mascotas (nombre, tipo, fecha de nacimiento, avatar), registros de salud (comidas, deposiciones, sueño, peso, notas), vacunas y citas veterinarias.
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              2. Almacenamiento local
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              Todos tus datos se almacenan localmente en tu dispositivo mediante AsyncStorage. No se envían a servidores externos ni se sincronizan con la nube. Si desinstalas la aplicación, tus datos se eliminarán permanentemente.
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              3. Terceros
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              No compartimos, vendemos ni transferimos tu información personal a terceros. La app utiliza Google AdMob para mostrar anuncios a usuarios gratuitos, el cual puede recopilar identificadores publicitarios anónimos conforme a su propia política de privacidad.
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              4. Notificaciones
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              Si otorgas permiso, CatacApp programa notificaciones locales para recordatorios de vacunas, citas veterinarias y rutinas. Estas notificaciones se procesan en tu dispositivo y no requieren conexión a internet.
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              5. Tus derechos
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              Puedes eliminar todos tus datos en cualquier momento desde Ajustes {">"} Zona de Peligro {">"} Borrar todos los datos. También puedes eliminar mascotas individuales y sus registros asociados.
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              6. Contacto
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              Si tienes preguntas sobre esta política, escríbenos a soporte@catacapp.com.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 30, fontWeight: "700" },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },

  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { fontSize: 17, fontWeight: "700" },
  accountEmail: { fontSize: 13, fontWeight: "500" },
  premiumChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  premiumChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  premiumBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  premiumBannerText: { gap: 2 },
  premiumBannerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  premiumBannerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },

  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryNumber: { fontSize: 28, fontWeight: "800" },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  summaryDivider: { width: 1, height: 40, opacity: 0.5 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingTitle: { fontSize: 15, fontWeight: "700" },
  settingSubtitle: { fontSize: 12, fontWeight: "500" },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  rowDivider: { height: 1, marginLeft: 64, opacity: 0.5 },

  themeSelector: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: "700",
  },

  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 20,
    marginBottom: 10,
  },

  privacyBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  privacyCard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  privacyTitle: { fontSize: 20, fontWeight: "800" },
  privacyScroll: { maxHeight: 500 },
  privacyDate: { fontSize: 12, fontWeight: "600", marginBottom: 16 },
  privacySectionTitle: { fontSize: 15, fontWeight: "800", marginTop: 16, marginBottom: 6 },
  privacyBody: { fontSize: 14, fontWeight: "500", lineHeight: 21 },
});
