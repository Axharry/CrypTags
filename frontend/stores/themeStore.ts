import { create } from 'zustand';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  loadTheme: () => void;
}

const THEME_KEY = 'cryptags_theme';

// Simple storage helper
const themeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Theme storage getItem error:', e);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('Theme storage setItem error:', e);
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

  setMode: (mode: ThemeMode) => {
    themeStorage.setItem(THEME_KEY, mode);
    set({ mode, isDark: getEffectiveTheme(mode) });
  },

  loadTheme: () => {
    try {
      const stored = themeStorage.getItem(THEME_KEY);
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
