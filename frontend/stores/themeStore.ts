import { create } from 'zustand';
import { Appearance, Platform } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = 'cryptags_theme';

// Check if running on web
const isWeb = Platform.OS === 'web' || typeof document !== 'undefined';

// Simple storage helper for theme
const themeStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb || typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    // For native, try AsyncStorage dynamically
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb || typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        // ignore
      }
    }
    // For native, try AsyncStorage dynamically
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // ignore
    }
  }
};

const getEffectiveTheme = (mode: ThemeMode): boolean => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  isDark: Appearance.getColorScheme() === 'dark',

  setMode: async (mode: ThemeMode) => {
    await themeStorage.setItem(THEME_KEY, mode);
    set({ mode, isDark: getEffectiveTheme(mode) });
  },

  loadTheme: async () => {
    try {
      const stored = await themeStorage.getItem(THEME_KEY);
      const mode = (stored as ThemeMode) || 'system';
      set({ mode, isDark: getEffectiveTheme(mode) });
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  },
}));

export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  primary: '#6C5CE7',
  primaryDark: '#5B4CD9',
  accent: '#00D9A5',
  border: '#E0E0E0',
  error: '#FF6B6B',
  success: '#00D9A5',
  warning: '#FFB800',
  inputBackground: '#F5F5F5',
};

export const darkTheme = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  card: '#252525',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  primary: '#6C5CE7',
  primaryDark: '#5B4CD9',
  accent: '#00D9A5',
  border: '#333333',
  error: '#FF6B6B',
  success: '#00D9A5',
  warning: '#FFB800',
  inputBackground: '#1A1A1A',
};

export const getTheme = (isDark: boolean) => isDark ? darkTheme : lightTheme;
