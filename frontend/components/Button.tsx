import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled || loading ? 0.6 : 1,
    };

    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingVertical: 8, paddingHorizontal: 16 },
      medium: { paddingVertical: 14, paddingHorizontal: 24 },
      large: { paddingVertical: 18, paddingHorizontal: 32 },
    };

    const variantStyles: Record<string, ViewStyle> = {
      primary: { backgroundColor: theme.primary },
      secondary: { backgroundColor: theme.surface },
      outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.primary },
      ghost: { backgroundColor: 'transparent' },
    };

    return { ...base, ...sizeStyles[size], ...variantStyles[variant] };
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
    };

    const sizeStyles: Record<string, TextStyle> = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: { color: '#FFFFFF' },
      secondary: { color: theme.text },
      outline: { color: theme.primary },
      ghost: { color: theme.primary },
    };

    return { ...base, ...sizeStyles[size], ...variantStyles[variant] };
  };

  const iconColor = variant === 'primary' ? '#FFFFFF' : theme.primary;

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {icon && (
            <Ionicons name={icon} size={20} color={iconColor} style={styles.icon} />
          )}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  icon: {
    marginRight: 8,
  },
});
