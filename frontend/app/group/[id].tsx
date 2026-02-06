import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { groupsAPI, contactsAPI, Group, Contact } from '../../services/api';
import { ContactCard } from '../../components/ContactCard';

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

const getGroupColor = (name: string) => {
  const index = name.charCodeAt(0) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index];
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<Group | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [groupRes, contactsRes] = await Promise.all([
        groupsAPI.getOne(id!),
        contactsAPI.getAll({ group_id: id }),
      ]);
      setGroup(groupRes.data);
      setContacts(contactsRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load group');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleFavorite = async (contact: Contact) => {
    try {
      await contactsAPI.toggleFavorite(contact.id);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleRemoveFromGroup = async (contact: Contact) => {
    Alert.alert(
      'Remove from Group',
      `Remove ${contact.name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsAPI.removeContact(id!, contact.id);
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove contact from group');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) return null;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No contacts in this group</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Add contacts to this group from their detail page
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      {/* Group Header */}
      <View style={styles.groupHeader}>
        {group.image ? (
          <Image source={{ uri: group.image }} style={styles.groupImage} />
        ) : (
          <View style={[styles.groupImage, { backgroundColor: getGroupColor(group.name) }]}>
            <Text style={styles.groupInitials}>{getInitials(group.name)}</Text>
          </View>
        )}
        <Text style={[styles.groupName, { color: theme.text }]}>{group.name}</Text>
        {group.description && (
          <Text style={[styles.groupDescription, { color: theme.textSecondary }]}>
            {group.description}
          </Text>
        )}
        <Text style={[styles.groupCount, { color: theme.textSecondary }]}>
          {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
        </Text>
      </View>

      {/* Contacts List */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <ContactCard
              contact={item}
              onPress={() => router.push(`/contact/${item.id}`)}
              onFavoritePress={() => handleToggleFavorite(item)}
            />
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: theme.error + '15' }]}
              onPress={() => handleRemoveFromGroup(item)}
            >
              <Ionicons name="remove-circle-outline" size={16} color={theme.error} />
              <Text style={[styles.removeButtonText, { color: theme.error }]}>Remove from group</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) }
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  groupImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  groupCount: {
    fontSize: 14,
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
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
