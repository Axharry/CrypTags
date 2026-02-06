import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const { isDark, loadTheme } = useThemeStore();
  const { isLoading, loadAuth } = useAuthStore();
  const theme = getTheme(isDark);

  useEffect(() => {
    loadTheme();
    loadAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'fade',
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
