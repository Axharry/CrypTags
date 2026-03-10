import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { CustomCrypto, DefaultCrypto } from '../types';
import { cryptosStorage } from '../services/localStorage';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function CryptosScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const [defaultCryptos, setDefaultCryptos] = useState<DefaultCrypto[]>([]);
  const [customCryptos, setCustomCryptos] = useState<CustomCrypto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRegex, setNewRegex] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCryptos();
  }, []);

  const loadCryptos = async () => {
    try {
      const result = await cryptosStorage.getAll();
      setDefaultCryptos(result.default_cryptos);
      setCustomCryptos(result.custom_cryptos);
    } catch (error) {
      Alert.alert('Error', 'Failed to load cryptocurrencies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrypto = async () => {
    if (!newName.trim() || !newSymbol.trim()) {
      Alert.alert('Validation Error', 'Please enter both name and symbol');
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
      setShowAddForm(false);
      loadCryptos();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add cryptocurrency';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCrypto = (crypto: CustomCrypto) => {
    Alert.alert(
      'Delete Cryptocurrency',
      `Are you sure you want to delete ${crypto.name} (${crypto.symbol})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cryptosStorage.delete(crypto.id);
              loadCryptos();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete cryptocurrency');
            }
          },
        },
      ]
    );
  };

  const CryptoItem: React.FC<{
    name: string;
    symbol: string;
    isCustom?: boolean;
    onDelete?: () => void;
  }> = ({ name, symbol, isCustom, onDelete }) => (
    <View style={[styles.cryptoItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.cryptoBadge, { backgroundColor: theme.primary + '20' }]}>
        <Text style={[styles.cryptoSymbol, { color: theme.primary }]}>{symbol}</Text>
      </View>
      <Text style={[styles.cryptoName, { color: theme.text }]}>{name}</Text>
      {isCustom && onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cryptocurrencies</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Default Cryptos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                DEFAULT CRYPTOCURRENCIES
              </Text>
              {defaultCryptos.map((crypto) => (
                <CryptoItem key={crypto.symbol} name={crypto.name} symbol={crypto.symbol} />
              ))}
            </View>

            {/* Custom Cryptos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                CUSTOM CRYPTOCURRENCIES
              </Text>
              {customCryptos.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                  <Ionicons name="add-circle-outline" size={40} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No custom cryptocurrencies yet
                  </Text>
                </View>
              ) : (
                customCryptos.map((crypto) => (
                  <CryptoItem
                    key={crypto.id}
                    name={crypto.name}
                    symbol={crypto.symbol}
                    isCustom
                    onDelete={() => handleDeleteCrypto(crypto)}
                  />
                ))
              )}

              {/* Add New Form */}
              {showAddForm ? (
                <View style={[styles.addForm, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.addFormTitle, { color: theme.text }]}>Add Custom Cryptocurrency</Text>
                  <Input
                    label="Name"
                    placeholder="e.g., Dogecoin"
                    value={newName}
                    onChangeText={setNewName}
                  />
                  <Input
                    label="Symbol"
                    placeholder="e.g., DOGE"
                    value={newSymbol}
                    onChangeText={(text) => setNewSymbol(text.toUpperCase())}
                    autoCapitalize="characters"
                  />
                  <Input
                    label="Address Regex (Optional)"
                    placeholder="e.g., ^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$"
                    value={newRegex}
                    onChangeText={setNewRegex}
                    autoCapitalize="none"
                  />
                  <View style={styles.formButtons}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setShowAddForm(false);
                        setNewName('');
                        setNewSymbol('');
                        setNewRegex('');
                      }}
                      variant="outline"
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                      title="Add"
                      onPress={handleAddCrypto}
                      loading={saving}
                      style={{ flex: 1, marginLeft: 8 }}
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addButton, { borderColor: theme.primary }]}
                  onPress={() => setShowAddForm(true)}
                >
                  <Ionicons name="add" size={20} color={theme.primary} />
                  <Text style={[styles.addButtonText, { color: theme.primary }]}>
                    Add Custom Cryptocurrency
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  cryptoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  cryptoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  cryptoSymbol: {
    fontSize: 12,
    fontWeight: '700',
  },
  cryptoName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  addForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
