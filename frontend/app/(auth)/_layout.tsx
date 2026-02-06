import React from 'react';
import { Stack } from 'expo-router';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';

export default function AuthLayout() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
