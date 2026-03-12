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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { Contact, Group } from '../../types';
import { contactsStorage, groupsStorage } from '../../services/localStorage';
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
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      // Fetch group
      const groupResult = await groupsStorage.getOne(id!);
      setGroup(groupResult);

      // Fetch contacts in group
      const groupContacts = await contactsStorage.search({ group_id: id! });
      setContacts(groupContacts);

      // Fetch all contacts for add modal
      const all = await contactsStorage.getAll();
      setAllContacts(all);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      await contactsStorage.toggleFavorite(contact.id);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleAddContact = async (contactId: string) => {
    try {
      await groupsStorage.addContact(id!, contactId);
      setShowAddContact(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add contact to group');
    }
  };

  const handleRemoveContact = (contact: Contact) => {
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
              await groupsStorage.removeContact(id!, contact.id);
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove contact');
            }
          },
        },
      ]
    );
  };

  const contactsNotInGroup = allContacts.filter(
    (c) => !contacts.some((gc) => gc.id === c.id)
  ).filter(
    (c) => searchQuery ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddContact(true)}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Group Info */}
      <View style={styles.groupInfo}>
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
          <View style={styles.contactItemWrapper}>
            <TouchableOpacity
              style={styles.removeContactButton}
              onPress={() => handleRemoveContact(item)}
            >
              <Ionicons name="remove-circle" size={24} color={theme.error} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <ContactCard
                contact={item}
                onPress={() => router.push(`/contact/${item.id}`)}
                onFavoritePress={() => handleToggleFavorite(item)}
              />
            </View>
          </View>
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No contacts yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Tap the + button to add contacts to this group
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContact}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddContact(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, 24) }
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Contact</Text>
              <TouchableOpacity onPress={() => setShowAddContact(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search contacts..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={contactsNotInGroup}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.contactItem, { borderBottomColor: theme.border }]}
                  onPress={() => handleAddContact(item.id)}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: getGroupColor(item.name) }]}>
                    <Text style={styles.contactInitials}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.contactAddresses, { color: theme.textSecondary }]}>
                      {item.crypto_addresses.length} addresses
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
              style={styles.modalList}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery ? 'No contacts found' : 'All contacts are already in this group'}
                </Text>
              }
            />
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    alignItems: 'center',
    paddingVertical: 16,
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
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  groupCount: {
    fontSize: 13,
  },
  listContent: {
    paddingTop: 8,
    flexGrow: 1,
  },
  contactItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeContactButton: {
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
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
    maxHeight: '80%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  modalList: {
    maxHeight: 400,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactAddresses: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 15,
  },
});
