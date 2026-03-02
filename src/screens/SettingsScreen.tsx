import React, { useState } from "react";
import Constants from "expo-constants";
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
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { changeLanguage, getCurrentLanguageLabel } from '../i18n';
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
import { useVaccines } from "../app/state/VaccinesContext";
import { useHousehold } from "../app/state/HouseholdContext";
import { deleteHouseholdData, addDocument } from "../services/firestore";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components/ui/Icon";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import ScreenContainer from "../components/layout/ScreenContainer";

import { fonts } from '../theme/fonts';
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
  const { t: tr } = useTranslation();

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
              <Text style={[styles.premiumBadgeText, { color: t.accent }]}>{tr('premium.badge')}</Text>
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

export default function SettingsScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { themeMode, setThemeMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { isPremium, cancelSubscription, status: premiumStatus } = usePremium();
  const { settings: notificationSettings, updateSettings, hasPermission, requestPermission, scheduleRoutineReminder, cancelRoutineReminder, cancelAllNotifications } = useNotifications();
  const { showInterstitial, showAds } = useAds();
  const { pets } = usePet();
  const { records, routines } = useRecords();
  const { visits } = useVet();
  const { vaccines } = useVaccines();
  const { householdId } = useHousehold();
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const themeModeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'system': return tr('settings.themeSystem');
      case 'light': return tr('settings.themeLight');
      case 'dark': return tr('settings.themeDark');
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          tr('settings.permissionsNeeded'),
          tr('settings.permissionsMsg')
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
      { text: tr('settings.daysBefore', { count: 1 }), value: 1 },
      { text: tr('settings.daysBefore', { count: 3 }), value: 3 },
      { text: tr('settings.daysBefore', { count: 7 }), value: 7 },
    ];
    Alert.alert(
      tr('settings.reminderDaysTitle'),
      tr('settings.reminderDaysMsg'),
      [
        ...options.map(opt => ({
          text: opt.text + (notificationSettings.reminderDaysBefore === opt.value ? " \u2713" : ""),
          onPress: () => updateSettings({ reminderDaysBefore: opt.value }),
        })),
        { text: tr('common.cancel'), style: "cancel" as const },
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
      tr('settings.reminderHourTitle'),
      tr('settings.reminderHourMsg'),
      [
        ...options.map(opt => ({
          text: opt.text + (notificationSettings.reminderHour === opt.value ? " \u2713" : ""),
          onPress: () => updateSettings({ reminderHour: opt.value }),
        })),
        { text: tr('common.cancel'), style: "cancel" as const },
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

  const handleChangeLanguage = () => {
    Alert.alert(
      tr('settings.language'),
      tr('settings.languageDesc'),
      [
        { text: 'Español', onPress: () => changeLanguage('es') },
        { text: 'English', onPress: () => changeLanguage('en') },
        { text: 'Français', onPress: () => changeLanguage('fr') },
        { text: 'Português', onPress: () => changeLanguage('pt') },
        { text: 'Català', onPress: () => changeLanguage('ca') },
        { text: 'Euskara', onPress: () => changeLanguage('eu') },
        { text: 'Galego', onPress: () => changeLanguage('gl') },
        { text: 'Türkçe', onPress: () => changeLanguage('tr') },
        { text: tr('settings.languageAuto'), onPress: () => changeLanguage('auto') },
        { text: tr('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleExportData = () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    Alert.alert(
      tr('settings.exportTitle'),
      tr('settings.exportMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        { text: tr('settings.export'), onPress: doExportCSV },
      ]
    );
  };

  const doExportCSV = async () => {
    try {
      let csv = tr('settings.csvPets') + "\n";
      csv += tr('settings.csvPetsHeader') + "\n";
      pets.forEach(p => {
        csv += `"${p.name}","${p.type}","${p.status}","${p.birthDate || ""}"\n`;
      });

      csv += "\n" + tr('settings.csvRecords') + "\n";
      csv += tr('settings.csvRecordsHeader') + "\n";
      records.forEach(r => {
        const pet = pets.find(p => p.id === r.petId);
        csv += `"${pet?.name || ""}","${r.type}","${r.title}","${r.value}","${r.timestamp}","${r.source}"\n`;
      });

      csv += "\n" + tr('settings.csvRoutines') + "\n";
      csv += tr('settings.csvRoutinesHeader') + "\n";
      routines.forEach(r => {
        const pet = pets.find(p => p.id === r.petId);
        csv += `"${pet?.name || ""}","${r.type}","${r.title}","${r.time}","${r.active}"\n`;
      });

      csv += "\n" + tr('settings.csvVetVisits') + "\n";
      csv += tr('settings.csvVetVisitsHeader') + "\n";
      visits.forEach(v => {
        const pet = pets.find(p => p.id === v.petId);
        csv += `"${pet?.name || ""}","${v.type}","${v.date}","${v.veterinarian}","${v.reason}","${v.notes}"\n`;
      });

      const file = new FSFile(Paths.cache, "catacapp_export.csv");
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: tr('settings.exportDialogTitle') });
    } catch (error) {
      Alert.alert(tr('common.error'), tr('settings.exportError'));
    }
  };

  const handleCreateBackup = async () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    Alert.alert(
      tr('settings.createBackupTitle'),
      tr('settings.createBackupMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        { text: tr('settings.createBackup'), onPress: doCreateBackup },
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
          vaccines,
        },
      };

      const json = JSON.stringify(backup, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      const file = new FSFile(Paths.cache, `catacapp_backup_${date}.json`);
      file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: tr('settings.backupDialogTitle') });
    } catch (error) {
      Alert.alert(tr('common.error'), tr('settings.backupError'));
    }
  };

  const handleRestoreBackup = async () => {
    if (!isPremium) {
      (navigation as any).navigate("Premium");
      return;
    }
    Alert.alert(
      tr('settings.restoreBackupTitle'),
      tr('settings.restoreBackupMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        { text: tr('settings.restore'), style: "destructive", onPress: doRestoreBackup },
      ]
    );
  };

  const doRestoreBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const fileUri = result.assets[0].uri;
      const file = new FSFile(fileUri);
      const content = await file.text();
      const backup = JSON.parse(content);

      // Validar estructura del backup
      if (!backup.version || !backup.data || !backup.data.pets) {
        Alert.alert(tr('common.error'), tr('settings.restoreInvalid'));
        return;
      }

      if (!householdId) return;

      // Cancelar todas las notificaciones existentes
      await cancelAllNotifications();

      // Clear existing Firestore data
      await deleteHouseholdData(householdId);

      // Write backup data to Firestore
      const { pets: bPets, records: bRecords, routines: bRoutines, vetVisits: bVisits, vaccines: bVaccines } = backup.data;

      for (const pet of (bPets || [])) {
        const { id, ...data } = pet;
        await addDocument(householdId, 'pets', data);
      }
      for (const record of (bRecords || [])) {
        const { id, ...data } = record;
        await addDocument(householdId, 'records', data);
      }
      for (const routine of (bRoutines || [])) {
        const { id, ...data } = routine;
        await addDocument(householdId, 'routines', data);
      }
      for (const visit of (bVisits || [])) {
        const { id, notificationId, ...data } = visit;
        await addDocument(householdId, 'vetVisits', data);
      }
      for (const vaccine of (bVaccines || [])) {
        const { id, notificationId, ...data } = vaccine;
        await addDocument(householdId, 'vaccines', data);
      }

      Alert.alert(
        tr('settings.restoreSuccess'),
        tr('settings.restoreSuccessMsg', {
          pets: bPets?.length || 0,
          records: bRecords?.length || 0,
          visits: bVisits?.length || 0,
          vaccines: bVaccines?.length || 0,
        }),
        [{ text: tr('common.ok') }]
      );
    } catch (error) {
      console.error("Error restoring backup:", error);
      Alert.alert(tr('common.error'), tr('settings.restoreError'));
    }
  };

  const handleViewCharts = () => {
    (navigation as any).navigate("Charts");
  };

  const handleViewHousehold = () => {
    (navigation as any).navigate("Household");
  };

  const handleClearData = () => {
    Alert.alert(
      tr('settings.clearDataTitle'),
      tr('settings.clearDataMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('settings.clearAll'),
          style: "destructive",
          onPress: async () => {
            try {
              if (!householdId) return;

              // Cancelar todas las notificaciones programadas
              await cancelAllNotifications();

              // Borrar todos los datos del household en Firestore
              await deleteHouseholdData(householdId);

              // Aviso de éxito
              Alert.alert(
                tr('settings.clearSuccess'),
                tr('settings.clearSuccessMsg'),
                [{ text: tr('common.ok') }]
              );
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert(tr('common.error'), tr('settings.clearError'));
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      tr('settings.logoutTitle'),
      tr('settings.logoutMsg'),
      [
        { text: tr('common.cancel'), style: "cancel" },
        {
          text: tr('settings.logout'),
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
      tr('settings.cancelSubscriptionTitle'),
      tr('settings.cancelSubscriptionMsg'),
      [
        { text: tr('settings.keepPlan'), style: "cancel" },
        {
          text: tr('settings.yesCancelPlan'),
          style: "destructive",
          onPress: async () => {
            const result = await cancelSubscription();
            if (result.success) {
              Alert.alert(tr('settings.subscriptionCancelled'), tr('settings.subscriptionCancelledMsg'));
            } else {
              Alert.alert(tr('common.error'), result.error || tr('auth.errors.cancelError'));
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL(`mailto:soporte@catacapp.com?subject=${encodeURIComponent(tr('settings.supportSubject'))}`);
  };

  const handlePrivacyPolicy = () => {
    setPrivacyVisible(true);
  };

  // TEST: Enviar notificación de prueba inmediata
  const handleTestNotification = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(tr('settings.permissionsNeeded'), tr('settings.permissionsTestMsg'));
        return;
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: tr('notifications.testTitle'),
        body: tr('notifications.testBody'),
        sound: true,
      },
      trigger: null, // null = inmediata
    });

    Alert.alert(tr('settings.testSent'), tr('settings.testSentMsg'));
  };

  // TEST: Mostrar intersticial de prueba
  const handleTestInterstitial = () => {
    if (!showAds) {
      Alert.alert(tr('settings.premiumActive'), tr('settings.premiumAdsMsg'));
      return;
    }
    showInterstitial();
    Alert.alert(tr('settings.testInterstitial'), tr('settings.interstitialMsg'));
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 6 }]}>
      <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon name="paw" size={18} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: t.text }]}>{tr('settings.title')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cuenta */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>{tr('settings.account')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
          <View style={styles.accountRow}>
            <View style={[styles.avatarCircle, { backgroundColor: t.accentSoft }]}>
              <Icon name="person" size={24} color={t.accent} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: t.text }]}>{user?.name || tr('settings.user')}</Text>
              <Text style={[styles.accountEmail, { color: t.textMuted }]}>{user?.email}</Text>
            </View>
            {isPremium && (
              <View style={[styles.premiumChip, { backgroundColor: t.accent }]}>
                <Icon name="diamond" size={14} color="#fff" />
                <Text style={styles.premiumChipText}>{tr('premium.badge')}</Text>
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
                  <Text style={styles.premiumBannerTitle}>{tr('settings.goPremium')}</Text>
                  <Text style={styles.premiumBannerSubtitle}>
                    {tr('settings.goPremiumDesc')}
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
              title={tr('settings.planPremium')}
              subtitle={premiumStatus.plan === 'lifetime' ? tr('settings.planLifetime') :
                       premiumStatus.plan === 'yearly' ? tr('settings.planYearly') :
                       premiumStatus.plan === 'monthly' ? tr('settings.planMonthly') : tr('settings.planActive')}
              onPress={handleManageSubscription}
            />
            <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
            <SettingRow
              icon="close-circle"
              title={tr('settings.cancelSubscription')}
              subtitle={tr('settings.cancelSubscriptionDesc')}
              onPress={handleCancelSubscription}
              danger
            />
          </View>
        )}

        {/* Apariencia */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>{tr('settings.appearance')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: t.accentSoft }]}>
              <Icon name="color-palette" size={20} color={t.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: t.text }]}>{tr('settings.theme')}</Text>
              <Text style={[styles.settingSubtitle, { color: t.textMuted }]}>
                {tr('settings.themeDesc')}
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
                  {themeModeLabel(mode)}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Language selector */}
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, ...shadows.sm, marginTop: 10 }]}>
          <SettingRow
            icon="language"
            title={tr('settings.language')}
            subtitle={getCurrentLanguageLabel()}
            onPress={handleChangeLanguage}
          />
        </View>

        {/* Notificaciones */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>{tr('settings.notifications')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <SettingRow
            icon="notifications"
            title={tr('settings.notificationsTitle')}
            subtitle={tr('settings.notificationsDesc')}
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
            title={tr('settings.vaccineReminders')}
            subtitle={tr('settings.vaccineRemindersDesc')}
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
            title={tr('settings.vetReminders')}
            subtitle={tr('settings.vetRemindersDesc')}
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
            title={tr('settings.reminderDays')}
            subtitle={tr('settings.daysBefore', { count: notificationSettings.reminderDaysBefore ?? 1 })}
            onPress={handleChangeReminderDays}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="alarm"
            title={tr('settings.reminderHour')}
            subtitle={`${(notificationSettings.reminderHour ?? 10).toString().padStart(2, "0")}:00`}
            onPress={handleChangeReminderHour}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="refresh"
            title={tr('settings.routineReminders')}
            subtitle={tr('settings.routineRemindersDesc')}
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
            title={tr('settings.testNotification')}
            subtitle={tr('settings.testNotificationDesc')}
            onPress={handleTestNotification}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="tv"
            title={tr('settings.testInterstitial')}
            subtitle={tr('settings.testInterstitialDesc')}
            onPress={handleTestInterstitial}
          />
        </View>

        {/* Más opciones */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>{tr('settings.moreOptions')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <SettingRow
            icon="home"
            title={tr('household.title')}
            subtitle={tr('household.settingsDesc')}
            onPress={handleViewHousehold}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="stats-chart"
            title={tr('settings.charts')}
            onPress={handleViewCharts}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="download"
            title={tr('settings.exportData')}
            subtitle={tr('settings.exportDataDesc')}
            onPress={handleExportData}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="cloud-upload"
            title={tr('settings.createBackup')}
            subtitle={tr('settings.createBackupDesc')}
            onPress={handleCreateBackup}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="cloud-download"
            title={tr('settings.restoreBackup')}
            subtitle={tr('settings.restoreBackupDesc')}
            onPress={handleRestoreBackup}
            locked={!isPremium}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="mail"
            title={tr('settings.contactSupport')}
            onPress={handleContactSupport}
          />
          <View style={[styles.rowDivider, { backgroundColor: t.border }]} />
          <SettingRow
            icon="document-text"
            title={tr('settings.privacyPolicy')}
            onPress={handlePrivacyPolicy}
          />
        </View>

        {/* Zona de peligro */}
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>{tr('settings.dangerZone')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <SettingRow
            icon="trash"
            title={tr('settings.clearData')}
            onPress={handleClearData}
            danger
          />
        </View>

        {/* Cerrar sesión */}
        <View style={[styles.sectionCard, { backgroundColor: t.card, borderColor: t.border, marginTop: 20 }]}>
          <SettingRow
            icon="log-out"
            title={tr('settings.logout')}
            onPress={handleLogout}
            danger
          />
        </View>

        {/* Versión */}
        <Text style={[styles.versionText, { color: t.textMuted }]}>
          CatacApp v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </ScrollView>

      </ScreenContainer>

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
            <Text style={[styles.privacyTitle, { color: t.text }]}>{tr('settings.privacy.title')}</Text>
            <AnimatedPressable onPress={() => setPrivacyVisible(false)} hitSlop={10}>
              <Icon name="close" size={24} color={t.textMuted} />
            </AnimatedPressable>
          </View>

          <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.privacyDate, { color: t.textMuted }]}>
              {tr('settings.privacy.lastUpdate')}
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              {tr('settings.privacy.section1Title')}
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              {tr('settings.privacy.section1Body')}
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              {tr('settings.privacy.section2Title')}
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              {tr('settings.privacy.section2Body')}
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              {tr('settings.privacy.section3Title')}
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              {tr('settings.privacy.section3Body')}
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              {tr('settings.privacy.section4Title')}
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              {tr('settings.privacy.section4Body')}
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              {tr('settings.privacy.section5Title')}
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              {tr('settings.privacy.section5Body')}
            </Text>

            <Text style={[styles.privacySectionTitle, { color: t.text }]}>
              {tr('settings.privacy.section6Title')}
            </Text>
            <Text style={[styles.privacyBody, { color: t.textMuted }]}>
              {tr('settings.privacy.section6Body')}
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
  headerTitle: { fontSize: 30, fontFamily: fonts.bold },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.black,
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
  accountName: { fontSize: 17, fontFamily: fonts.bold },
  accountEmail: { fontSize: 13, fontFamily: fonts.medium },
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.extraBold,
  },
  premiumBannerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: fonts.semiBold,
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
  summaryNumber: { fontSize: 28, fontFamily: fonts.extraBold },
  summaryLabel: { fontSize: 12, fontFamily: fonts.semiBold, marginTop: 4 },
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
  settingTitle: { fontSize: 15, fontFamily: fonts.bold },
  settingSubtitle: { fontSize: 12, fontFamily: fonts.medium },
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
    fontFamily: fonts.extraBold,
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
    fontFamily: fonts.bold,
  },

  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: fonts.medium,
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
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  privacyTitle: { fontSize: 20, fontFamily: fonts.extraBold },
  privacyScroll: { maxHeight: 500 },
  privacyDate: { fontSize: 12, fontFamily: fonts.semiBold, marginBottom: 16 },
  privacySectionTitle: { fontSize: 15, fontFamily: fonts.extraBold, marginTop: 16, marginBottom: 6 },
  privacyBody: { fontSize: 14, fontFamily: fonts.medium, lineHeight: 21 },
});
