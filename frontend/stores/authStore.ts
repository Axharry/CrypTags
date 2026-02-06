import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cryptags_auth_token';
const USER_KEY = 'cryptags_user';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

// Use AsyncStorage for web, SecureStore for native
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: async (token: string, user: User) => {
    await storage.setItem(TOKEN_KEY, token);
    await storage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  loadAuth: async () => {
    try {
      const token = await storage.getItem(TOKEN_KEY);
      const userStr = await storage.getItem(USER_KEY);
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      set({ isLoading: false });
    }
  },
}));
