import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.inputBackground,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={theme.textSecondary}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            { color: theme.text },
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  icon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
