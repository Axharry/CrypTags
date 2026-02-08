import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { en, TranslationKeys } from '../i18n/en';

export type LanguageCode = 'en' | 'id' | 'ms' | 'ar' | 'ko' | 'ja' | 'zh' | 'hi';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

const LANGUAGE_KEY = 'cryptags_language';

// Get device language
const getDeviceLanguage = (): LanguageCode => {
  try {
    let deviceLang = 'en';
    
    if (Platform.OS === 'ios') {
      deviceLang = NativeModules.SettingsManager?.settings?.AppleLocale ||
                   NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                   'en';
    } else if (Platform.OS === 'android') {
      deviceLang = NativeModules.I18nManager?.localeIdentifier || 'en';
    } else {
      deviceLang = navigator?.language || 'en';
    }
    
    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = deviceLang.split(/[-_]/)[0].toLowerCase();
    
    // Check if we support this language
    const supportedLang = LANGUAGES.find(l => l.code === langCode);
    return supportedLang ? supportedLang.code : 'en';
  } catch {
    return 'en';
  }
};

// Translation cache
const translationCache: Partial<Record<LanguageCode, TranslationKeys>> = {
  en: en,
};

// Load translation dynamically
const loadTranslation = async (code: LanguageCode): Promise<TranslationKeys> => {
  if (translationCache[code]) {
    return translationCache[code]!;
  }
  
  try {
    let translation: TranslationKeys;
    switch (code) {
      case 'id':
        translation = (await import('../i18n/id')).id;
        break;
      case 'ms':
        translation = (await import('../i18n/ms')).ms;
        break;
      case 'ar':
        translation = (await import('../i18n/ar')).ar;
        break;
      case 'ko':
        translation = (await import('../i18n/ko')).ko;
        break;
      case 'ja':
        translation = (await import('../i18n/ja')).ja;
        break;
      case 'zh':
        translation = (await import('../i18n/zh')).zh;
        break;
      case 'hi':
        translation = (await import('../i18n/hi')).hi;
        break;
      default:
        translation = en;
    }
    translationCache[code] = translation;
    return translation;
  } catch {
    return en;
  }
};

interface LanguageState {
  language: LanguageCode;
  translations: TranslationKeys;
  isRTL: boolean;
  setLanguage: (code: LanguageCode) => Promise<void>;
  loadLanguage: () => Promise<void>;
  t: TranslationKeys;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  translations: en,
  isRTL: false,
  t: en,

  setLanguage: async (code: LanguageCode) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, code);
    const translations = await loadTranslation(code);
    const lang = LANGUAGES.find(l => l.code === code);
    set({ 
      language: code, 
      translations, 
      t: translations,
      isRTL: lang?.rtl || false 
    });
  },

  loadLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      const code = (stored as LanguageCode) || getDeviceLanguage();
      const translations = await loadTranslation(code);
      const lang = LANGUAGES.find(l => l.code === code);
      set({ 
        language: code, 
        translations, 
        t: translations,
        isRTL: lang?.rtl || false 
      });
    } catch (error) {
      console.error('Error loading language:', error);
    }
  },
}));
