import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { Contact, SortOption, DefaultCrypto, CustomCrypto } from '../../types';
import { contactsStorage, cryptosStorage } from '../../services/localStorage';
import { ContactCard } from '../../components/ContactCard';
import { Input } from '../../components/Input';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'updated_desc', label: 'Recently Updated' },
  { value: 'updated_asc', label: 'Oldest Updated' },
  { value: 'created_desc', label: 'Recently Added' },
  { value: 'created_asc', label: 'Oldest Added' },
];

export default function ContactsScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [filterCrypto, setFilterCrypto] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [cryptos, setCryptos] = useState<(DefaultCrypto | CustomCrypto)[]>([]);

  const fetchContacts = async () => {
    try {
      const results = await contactsStorage.search({ 
        search: search || undefined,
        sort_by: sortBy,
        crypto_type: filterCrypto || undefined,
      });
      setContacts(results);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCryptos = async () => {
    try {
      const result = await cryptosStorage.getAll();
      setCryptos([...result.default_cryptos, ...result.custom_cryptos]);
    } catch (error) {
      console.error('Error fetching cryptos:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
      fetchCryptos();
    }, [search, sortBy, filterCrypto])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchContacts();
  };

  const handleToggleFavorite = async (contact: Contact) => {
    try {
      await contactsStorage.toggleFavorite(contact.id);
      fetchContacts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const clearFilters = () => {
    setSortBy('name_asc');
    setFilterCrypto(null);
    setShowFilters(false);
  };

  const hasActiveFilters = sortBy !== 'name_asc' || filterCrypto !== null;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {search || filterCrypto ? 'No contacts found' : 'No contacts yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {search || filterCrypto
          ? 'Try adjusting your filters'
          : 'Tap the + button to add your first contact'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Contacts</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/merge')}
          >
            <Ionicons name="git-merge" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/scan')}
          >
            <Ionicons name="scan" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/contact/add')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Input
              placeholder="Search contacts or addresses..."
              value={search}
              onChangeText={setSearch}
              icon="search-outline"
              style={{ marginBottom: 0 }}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: hasActiveFilters ? theme.primary : theme.surface }
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons 
              name="options-outline" 
              size={22} 
              color={hasActiveFilters ? '#FFFFFF' : theme.text} 
            />
          </TouchableOpacity>
        </View>
        
        {hasActiveFilters && (
          <View style={styles.activeFilters}>
            {sortBy !== 'name_asc' && (
              <View style={[styles.filterChip, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.filterChipText, { color: theme.primary }]}>
                  {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                </Text>
              </View>
            )}
            {filterCrypto && (
              <View style={[styles.filterChip, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.filterChipText, { color: theme.primary }]}>
                  {filterCrypto}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={clearFilters}>
              <Text style={[styles.clearFilters, { color: theme.error }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              onPress={() => router.push(`/contact/${item.id}`)}
              onFavoritePress={() => handleToggleFavorite(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 60 }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, 24) }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Sort & Filter</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Sort Options */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>SORT BY</Text>
            <View style={styles.optionsGrid}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: sortBy === option.value ? theme.primary : theme.surface,
                      borderColor: sortBy === option.value ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: sortBy === option.value ? '#FFFFFF' : theme.text }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Crypto Filter */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FILTER BY NETWORK</Text>
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { 
                    backgroundColor: filterCrypto === null ? theme.primary : theme.surface,
                    borderColor: filterCrypto === null ? theme.primary : theme.border,
                  }
                ]}
                onPress={() => setFilterCrypto(null)}
              >
                <Text style={[
                  styles.optionText,
                  { color: filterCrypto === null ? '#FFFFFF' : theme.text }
                ]}>
                  All Networks
                </Text>
              </TouchableOpacity>
              {cryptos.map((crypto) => (
                <TouchableOpacity
                  key={crypto.symbol}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: filterCrypto === crypto.symbol ? theme.primary : theme.surface,
                      borderColor: filterCrypto === crypto.symbol ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => setFilterCrypto(crypto.symbol)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: filterCrypto === crypto.symbol ? '#FFFFFF' : theme.text }
                  ]}>
                    {crypto.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: theme.border }]}
                onPress={clearFilters}
              >
                <Text style={[styles.resetButtonText, { color: theme.text }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearFilters: {
    fontSize: 13,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
