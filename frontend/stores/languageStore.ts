import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../config/i18n';

export type LanguageCode = 'en' | 'id';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

const LANGUAGE_KEY = 'cryptags_language';

interface LanguageState {
  language: LanguageCode;
  isLoading: boolean;
  changeLanguage: (code: LanguageCode) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  isLoading: true,

  loadLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      const code = (stored as LanguageCode) || 'en';
      await i18n.changeLanguage(code);
      set({ language: code, isLoading: false });
    } catch (error) {
      console.error('Error loading language:', error);
      set({ language: 'en', isLoading: false });
    }
  },

  changeLanguage: async (code: LanguageCode) => {
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
      set({ language: code });
    } catch (error) {
      console.error('Error changing language:', error);
      throw error;
    }
  },
}));

