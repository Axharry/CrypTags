import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { CustomCrypto, DefaultCrypto } from '../types';
import { cryptosStorage, DEFAULT_CRYPTOS } from '../services/localStorage';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

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

export default function CryptosScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  const [customCryptos, setCustomCryptos] = useState<CustomCrypto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRegex, setNewRegex] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCryptos = async () => {
    try {
      const result = await cryptosStorage.getAll();
      setCustomCryptos(result.custom_cryptos);
    } catch (error) {
      console.error('Error fetching cryptos:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCryptos();
    }, [])
  );

  const handleAddCrypto = async () => {
    if (!newName.trim() || !newSymbol.trim()) {
      Alert.alert('Error', 'Please enter both name and symbol');
      return;
    }

    setSaving(true);
    try {
      await cryptosStorage.create({
        name: newName.trim(),
        symbol: newSymbol.trim().toUpperCase(),
        address_regex: newRegex.trim() || undefined,
      });
      setNewName('');
      setNewSymbol('');
      setNewRegex('');
      setShowAddModal(false);
      fetchCryptos();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add cryptocurrency');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCrypto = (crypto: CustomCrypto) => {
    Alert.alert(
      'Delete Cryptocurrency',
      `Are you sure you want to delete ${crypto.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cryptosStorage.delete(crypto.id);
              fetchCryptos();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete cryptocurrency');
            }
          },
        },
      ]
    );
  };

  const renderDefaultCrypto = ({ item }: { item: DefaultCrypto }) => (
    <View style={[styles.cryptoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.cryptoBadge, { backgroundColor: getCryptoColor(item.symbol) }]}>
        <Text style={styles.cryptoBadgeText}>{item.symbol}</Text>
      </View>
      <View style={styles.cryptoInfo}>
        <Text style={[styles.cryptoName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.cryptoSymbol, { color: theme.textSecondary }]}>
          {item.symbol} • Default
        </Text>
      </View>
      <View style={[styles.defaultBadge, { backgroundColor: theme.surface }]}>
        <Text style={[styles.defaultText, { color: theme.textSecondary }]}>Built-in</Text>
      </View>
    </View>
  );

  const renderCustomCrypto = ({ item }: { item: CustomCrypto }) => (
    <View style={[styles.cryptoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.cryptoBadge, { backgroundColor: getCryptoColor(item.symbol) }]}>
        <Text style={styles.cryptoBadgeText}>{item.symbol}</Text>
      </View>
      <View style={styles.cryptoInfo}>
        <Text style={[styles.cryptoName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.cryptoSymbol, { color: theme.textSecondary }]}>
          {item.symbol} • Custom
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteCrypto(item)}
        style={styles.deleteButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={20} color={theme.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cryptocurrencies</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={[...DEFAULT_CRYPTOS, ...customCryptos] as any}
          keyExtractor={(item: any) => item.id || item.symbol}
          renderItem={({ item }: any) => {
            if (item.id) {
              return renderCustomCrypto({ item } as { item: CustomCrypto });
            }
            return renderDefaultCrypto({ item } as { item: DefaultCrypto });
          }}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) }
          ]}
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              AVAILABLE CRYPTOCURRENCIES
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Crypto Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[
            styles.modalContent,
            { backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, 24) }
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Custom Crypto</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Input
                label="Cryptocurrency Name"
                placeholder="e.g., Dogecoin"
                value={newName}
                onChangeText={setNewName}
                icon="cash-outline"
              />

              <Input
                label="Symbol"
                placeholder="e.g., DOGE"
                value={newSymbol}
                onChangeText={(text) => setNewSymbol(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
                icon="code-outline"
              />

              <Input
                label="Address Validation Regex (Optional)"
                placeholder="e.g., ^D[a-zA-Z0-9]{33}$"
                value={newRegex}
                onChangeText={setNewRegex}
                autoCapitalize="none"
                autoCorrect={false}
                icon="shield-checkmark-outline"
              />

              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                The regex pattern is used to validate addresses. Leave empty to skip validation.
              </Text>

              <Button
                title="Add Cryptocurrency"
                onPress={handleAddCrypto}
                loading={saving}
                icon="add-circle"
                style={{ marginTop: 16 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  cryptoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cryptoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  cryptoBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cryptoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '500',
  },
  cryptoSymbol: {
    fontSize: 13,
    marginTop: 2,
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
