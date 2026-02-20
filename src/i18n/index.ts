import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import es from './es';
import en from './en';
import fr from './fr';
import pt from './pt';
import ca from './ca';
import eu from './eu';
import gl from './gl';
import tk from './tk';

const LANGUAGE_KEY = '@catacapp_language';

const SUPPORTED_LANGUAGES = ['es', 'en', 'fr', 'pt', 'ca', 'eu', 'gl', 'tr'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resolveDeviceLanguage = (): SupportedLanguage => {
  const deviceLang = Localization.getLocales()[0]?.languageCode || 'es';
  if (SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)) {
    return deviceLang as SupportedLanguage;
  }
  return 'es';
};

const initI18n = async () => {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  const lng = saved || resolveDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      fr: { translation: fr },
      pt: { translation: pt },
      ca: { translation: ca },
      eu: { translation: eu },
      gl: { translation: gl },
      tr: { translation: tk },
    },
    lng,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  });
};

initI18n();

export const changeLanguage = async (lang: string) => {
  if (lang === 'auto') {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
    await i18n.changeLanguage(resolveDeviceLanguage());
  } else {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  }
};

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  pt: 'pt-BR',
  es: 'es-ES',
  ca: 'ca-ES',
  eu: 'eu-ES',
  gl: 'gl-ES',
  tr: 'tr-TR',
};

export const getLocale = (): string => LOCALE_MAP[i18n.language] || 'es-ES';

export const getCurrentLanguageLabel = (): string => {
  switch (i18n.language) {
    case 'en': return 'English';
    case 'fr': return 'Français';
    case 'pt': return 'Português';
    case 'ca': return 'Català';
    case 'eu': return 'Euskara';
    case 'gl': return 'Galego';
    case 'tr': return 'Türkçe';
    case 'es': return 'Español';
    default: return 'Español';
  }
};

export default i18n;
