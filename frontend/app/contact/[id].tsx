import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { Contact, CryptoAddress, Group } from '../../types';
import { contactsStorage, groupsStorage } from '../../services/localStorage';
import { CryptoAddressItem } from '../../components/CryptoAddressItem';
import { Button } from '../../components/Button';
import * as Clipboard from 'expo-clipboard';

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

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CryptoAddress | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  useEffect(() => {
    fetchContact();
    fetchGroups();
  }, [id]);

  const fetchContact = async () => {
    try {
      const result = await contactsStorage.getOne(id!);
      setContact(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contact');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const result = await groupsStorage.getAll();
      setGroups(result);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!contact) return;
    try {
      await contactsStorage.toggleFavorite(contact.id);
      fetchContact();
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactsStorage.delete(id!);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const handleShowQR = (address: CryptoAddress) => {
    setSelectedAddress(address);
    setQrModalVisible(true);
  };

  const handleCopyAddress = () => {
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const handleToggleGroup = async (groupId: string) => {
    if (!contact) return;
    const currentGroups = contact.group_ids || [];
    const isInGroup = currentGroups.includes(groupId);

    try {
      if (isInGroup) {
        await groupsStorage.removeContact(groupId, contact.id);
      } else {
        await groupsStorage.addContact(groupId, contact.id);
      }
      await fetchContact();
      await fetchGroups();
    } catch (error) {
      Alert.alert('Error', 'Failed to update groups');
    }
  };

  const getContactGroups = () => {
    if (!contact || !contact.group_ids) return [];
    return groups.filter(g => contact.group_ids.includes(g.id));
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

  if (!contact) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleToggleFavorite}
          >
            <Ionicons
              name={contact.is_favorite ? 'star' : 'star-outline'}
              size={24}
              color={contact.is_favorite ? '#FFB800' : theme.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push(`/contact/edit/${id}`)}
          >
            <Ionicons name="create-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
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
          <Text style={[styles.name, { color: theme.text }]}>{contact.name}</Text>
          {contact.notes && (
            <Text style={[styles.notes, { color: theme.textSecondary }]}>
              {contact.notes}
            </Text>
          )}
        </View>

        <View style={styles.addressesSection}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            CRYPTO ADDRESSES ({contact.crypto_addresses.length})
          </Text>
          {contact.crypto_addresses.length === 0 ? (
            <View style={[styles.emptyAddresses, { backgroundColor: theme.surface }]}>
              <Ionicons name="wallet-outline" size={40} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No addresses added yet
              </Text>
            </View>
          ) : (
            contact.crypto_addresses.map((addr) => (
              <CryptoAddressItem
                key={addr.id}
                address={addr}
                onQRPress={() => handleShowQR(addr)}
                onCopyPress={handleCopyAddress}
              />
            ))
          )}
        </View>

        {/* Groups Section */}
        <View style={styles.addressesSection}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            GROUPS ({getContactGroups().length})
          </Text>
          <View style={styles.groupsContainer}>
            {getContactGroups().map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupChip, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                onPress={() => router.push(`/group/${group.id}`)}
              >
                <Text style={[styles.groupChipText, { color: theme.primary }]}>{group.name}</Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleGroup(group.id);
                  }}
                  style={styles.removeGroupButton}
                >
                  <Ionicons name="close-circle" size={18} color={theme.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.addGroupChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowGroupSelector(true)}
            >
              <Ionicons name="add" size={20} color={theme.primary} />
              <Text style={[styles.addGroupText, { color: theme.primary }]}>Add to Group</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.editButtonContainer}>
          <Button
            title="Edit Contact"
            onPress={() => router.push(`/contact/edit/${id}`)}
            variant="outline"
            icon="create-outline"
          />
        </View>
      </ScrollView>

      {/* Group Selector Modal */}
      <Modal
        visible={showGroupSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGroupSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.groupSelectorModal, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Groups</Text>
              <TouchableOpacity onPress={() => setShowGroupSelector(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.groupsList}>
              {groups.map((group) => {
                const isSelected = contact?.group_ids?.includes(group.id);
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleToggleGroup(group.id)}
                  >
                    <Text style={[styles.groupItemText, { color: theme.text }]}>{group.name}</Text>
                    <View style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? theme.primary : 'transparent',
                        borderColor: isSelected ? theme.primary : theme.border,
                      }
                    ]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {groups.length === 0 && (
                <Text style={[styles.emptyGroupsText, { color: theme.textSecondary }]}>
                  No groups available. Create one from the Groups tab.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setQrModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>

            {selectedAddress && (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedAddress.crypto_type} Address
                </Text>
                {selectedAddress.label && (
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
                    {selectedAddress.label}
                  </Text>
                )}
                <View style={styles.qrContainer}>
                  <QRCode
                    value={selectedAddress.address}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
                <Text
                  style={[styles.modalAddress, { color: theme.textSecondary }]}
                  selectable
                >
                  {selectedAddress.address}
                </Text>
                <Button
                  title="Copy Address"
                  onPress={async () => {
                    await Clipboard.setStringAsync(selectedAddress.address);
                    Alert.alert('Copied', 'Address copied to clipboard');
                  }}
                  icon="copy-outline"
                  style={{ marginTop: 16 }}
                />
              </>
            )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  initials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  notes: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  addressesSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyAddresses: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
  },
  editButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  groupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  groupChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeGroupButton: {
    marginLeft: 2,
  },
  addGroupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  addGroupText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  groupSelectorModal: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 20,
    overflow: 'hidden',
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
  groupsList: {
    maxHeight: 400,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  groupItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGroupsText: {
    padding: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  modalAddress: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
