import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { CryptoAddress } from '../services/api';

interface CryptoAddressItemProps {
  address: CryptoAddress;
  onQRPress?: () => void;
  onCopyPress?: () => void;
  onEditPress?: () => void;
  onDeletePress?: () => void;
  showActions?: boolean;
}

const CRYPTO_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  USDT: '#26A17B',
  SOL: '#9945FF',
  BNB: '#F3BA2F',
  MATIC: '#8247E5',
  AVAX: '#E84142',
  ARB: '#28A0F0',
  OP: '#FF0420',
  TRX: '#FF0013',
};

const getCryptoColor = (symbol: string) => {
  return CRYPTO_COLORS[symbol.toUpperCase()] || '#6C5CE7';
};

export const CryptoAddressItem: React.FC<CryptoAddressItemProps> = ({
  address,
  onQRPress,
  onCopyPress,
  onEditPress,
  onDeletePress,
  showActions = true,
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(address.address);
    onCopyPress?.();
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: getCryptoColor(address.crypto_type) }]}>
          <Text style={styles.badgeText}>{address.crypto_type}</Text>
        </View>
        {address.label && (
          <Text style={[styles.label, { color: theme.textSecondary }]}>{address.label}</Text>
        )}
      </View>

      <Text
        style={[styles.address, { color: theme.text }]}
        selectable
        numberOfLines={1}
      >
        {truncateAddress(address.address)}
      </Text>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={20} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Copy</Text>
          </TouchableOpacity>

          {onQRPress && (
            <TouchableOpacity style={styles.actionButton} onPress={onQRPress}>
              <Ionicons name="qr-code-outline" size={20} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.primary }]}>QR</Text>
            </TouchableOpacity>
          )}

          {onEditPress && (
            <TouchableOpacity style={styles.actionButton} onPress={onEditPress}>
              <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {onDeletePress && (
            <TouchableOpacity style={styles.actionButton} onPress={onDeletePress}>
              <Ionicons name="trash-outline" size={20} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    marginLeft: 10,
    fontSize: 13,
  },
  address: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
