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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { groupsAPI, Group } from '../../types'
import { contactsStorage, groupsStorage, cryptosStorage, exportStorage } from '../../services/localStorage';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

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

export default function GroupsScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchGroups = async () => {
    try {
      const result = await groupsStorage.getAll();
      setGroups(result);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleCreateGroup = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setSaving(true);
    try {
      await groupsStorage.create({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        image: newImage || undefined,
      });
      setNewName('');
      setNewDescription('');
      setNewImage(null);
      setShowAddModal(false);
      fetchGroups();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = (group: Group) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? Contacts will not be deleted, only removed from this group.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsStorage.delete(group.id);
              fetchGroups();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => router.push(`/group/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.groupContent}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.groupImage} />
        ) : (
          <View style={[styles.groupImage, { backgroundColor: getGroupColor(item.name) }]}>
            <Text style={styles.groupInitials}>{getInitials(item.name)}</Text>
          </View>
        )}

        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={[styles.groupDescription, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.groupCount, { color: theme.textSecondary }]}>
            {item.contact_count} {item.contact_count === 1 ? 'contact' : 'contacts'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteGroup(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>

        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="business-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No groups yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Create groups to organize contacts by company, DAO, or project
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Groups</Text>
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
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
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

      {/* Add Group Modal */}
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
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Group Image */}
            <View style={styles.imageSection}>
              <TouchableOpacity onPress={handlePickImage}>
                {newImage ? (
                  <Image source={{ uri: newImage }} style={styles.newGroupImage} />
                ) : (
                  <View style={[styles.newGroupImage, { backgroundColor: theme.surface }]}>
                    <Ionicons name="camera" size={32} color={theme.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.imageHint, { color: theme.textSecondary }]}>
                Tap to add logo (optional)
              </Text>
            </View>

            <Input
              label="Group Name"
              placeholder="e.g., Ethereum Foundation, MakerDAO"
              value={newName}
              onChangeText={setNewName}
              icon="business-outline"
            />

            <Input
              label="Description (Optional)"
              placeholder="What is this group for?"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={2}
              icon="document-text-outline"
            />

            <Button
              title="Create Group"
              onPress={handleCreateGroup}
              loading={saving}
              icon="add-circle"
            />
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
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
    flexGrow: 1,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 14,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
  },
  groupDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  groupCount: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  newGroupImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHint: {
    fontSize: 13,
    marginTop: 8,
  },
});
