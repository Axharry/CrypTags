import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { Contact } from '../../types';
import { contactsStorage } from '../../services/localStorage';
import { ContactCard } from '../../components/ContactCard';

export default function FavoritesScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  const [favorites, setFavorites] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const results = await contactsStorage.search({ favorites_only: true });
      setFavorites(results);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleToggleFavorite = async (contact: Contact) => {
    try {
      await contactsStorage.toggleFavorite(contact.id);
      fetchFavorites();
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="star-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No favorites yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Star your most used contacts for quick access
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Favorites</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
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
});
