import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { Contact } from '../services/api';

interface ContactCardProps {
  contact: Contact;
  onPress: () => void;
  onFavoritePress: () => void;
}

const DEFAULT_AVATARS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00D9A5'
];

const getAvatarColor = (name: string) => {
  const index = name.charCodeAt(0) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onPress,
  onFavoritePress,
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const cryptoCount = contact.crypto_addresses.length;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {contact.profile_picture ? (
          <Image
            source={{ uri: contact.profile_picture }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(contact.name) }]}>
            <Text style={styles.initials}>{getInitials(contact.name)}</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {contact.name}
          </Text>
          <Text style={[styles.cryptoCount, { color: theme.textSecondary }]}>
            {cryptoCount} {cryptoCount === 1 ? 'address' : 'addresses'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={onFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={contact.is_favorite ? 'star' : 'star-outline'}
            size={24}
            color={contact.is_favorite ? '#FFB800' : theme.textSecondary}
          />
        </TouchableOpacity>

        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  cryptoCount: {
    fontSize: 13,
    marginTop: 2,
  },
  favoriteButton: {
    padding: 4,
    marginRight: 8,
  },
});
