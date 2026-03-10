import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore, getTheme } from '../stores/themeStore';
import '../config/i18n'; // Initialize i18n

export default function RootLayout() {
  const { isDark, loadTheme } = useThemeStore();
  const theme = getTheme(isDark);

  useEffect(() => {
    loadTheme();
  }, []);

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
