import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { Contact } from '../types';
import { contactsStorage } from '../services/localStorage';
import { Button } from '../components/Button';

const DEFAULT_AVATARS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
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

export default function MergeScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const fetchContacts = async () => {
    try {
      const results = await contactsStorage.getAll();
      setContacts(results);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [])
  );

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      // Remove from selection
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
      if (primaryId === id) {
        // Select next available as primary
        const remaining = selectedIds.filter((sid) => sid !== id);
        setPrimaryId(remaining[0] || null);
      }
    } else {
      // Add to selection
      setSelectedIds([...selectedIds, id]);
      if (!primaryId) {
        setPrimaryId(id);
      }
    }
  };

  const handleSetPrimary = (id: string) => {
    if (selectedIds.includes(id)) {
      setPrimaryId(id);
    }
  };

  const handleMerge = async () => {
    if (!primaryId || selectedIds.length < 2) {
      Alert.alert('Error', 'Select at least 2 contacts and choose a primary contact');
      return;
    }

    const sourceIds = selectedIds.filter((id) => id !== primaryId);
    const primaryContact = contacts.find((c) => c.id === primaryId);
    const sourceContacts = contacts.filter((c) => sourceIds.includes(c.id));

    Alert.alert(
      'Confirm Merge',
      `Merge ${sourceContacts.length} contact(s) into "${primaryContact?.name}"?\n\nAddresses and notes will be combined. Source contacts will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          style: 'destructive',
          onPress: async () => {
            setMerging(true);
            try {
              await contactsStorage.merge({
                primary_contact_id: primaryId,
                source_contact_ids: sourceIds,
                delete_source_contacts: true,
              });
              Alert.alert('Success', 'Contacts merged successfully');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to merge contacts');
            } finally {
              setMerging(false);
            }
          },
        },
      ]
    );
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const isSelected = selectedIds.includes(item.id);
    const isPrimary = primaryId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.contactCard,
          {
            backgroundColor: isSelected ? theme.primary + '10' : theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => handleToggleSelect(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.contactContent}>
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? theme.primary : 'transparent',
              borderColor: isSelected ? theme.primary : theme.border,
            },
          ]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>

          <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
            <Text style={styles.initials}>{getInitials(item.name)}</Text>
          </View>

          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.cryptoCount, { color: theme.textSecondary }]}>
              {item.crypto_addresses.length} addresses
            </Text>
          </View>

          {isSelected && (
            <TouchableOpacity
              style={[
                styles.primaryBadge,
                {
                  backgroundColor: isPrimary ? theme.primary : theme.surface,
                  borderColor: isPrimary ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleSetPrimary(item.id)}
            >
              <Text style={[
                styles.primaryText,
                { color: isPrimary ? '#FFFFFF' : theme.textSecondary },
              ]}>
                {isPrimary ? 'Primary' : 'Set Primary'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Merge Contacts</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.surface }]}>
        <Ionicons name="information-circle" size={20} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Select 2 or more contacts to merge. The primary contact keeps their name and receives all addresses from other contacts.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 80 }
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No contacts</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Create contacts first to merge them
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedIds.length >= 2 && (
        <View style={[styles.mergeButtonContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            title={`Merge ${selectedIds.length} Contacts`}
            onPress={handleMerge}
            loading={merging}
            icon="git-merge"
          />
        </View>
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  contactCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  cryptoCount: {
    fontSize: 13,
    marginTop: 2,
  },
  primaryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  mergeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
});
