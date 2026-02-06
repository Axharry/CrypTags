import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { contactsAPI, Contact } from '../services/api';
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

type MergeStep = 'select' | 'primary' | 'confirm';

export default function MergeScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [step, setStep] = useState<MergeStep>('select');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getAll();
      setContacts(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleNext = () => {
    if (step === 'select') {
      if (selectedIds.size < 2) {
        Alert.alert('Selection Required', 'Please select at least 2 contacts to merge');
        return;
      }
      setStep('primary');
    } else if (step === 'primary') {
      if (!primaryId) {
        Alert.alert('Primary Required', 'Please select a primary contact');
        return;
      }
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'primary') {
      setStep('select');
      setPrimaryId(null);
    } else if (step === 'confirm') {
      setStep('primary');
    } else {
      router.back();
    }
  };

  const handleMerge = async () => {
    if (!primaryId) return;

    const sourceIds = Array.from(selectedIds).filter(id => id !== primaryId);
    
    setMerging(true);
    try {
      await contactsAPI.merge({
        primary_contact_id: primaryId,
        source_contact_ids: sourceIds,
        delete_source_contacts: true,
      });
      Alert.alert(
        'Merge Complete',
        'Contacts have been successfully merged',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to merge contacts');
    } finally {
      setMerging(false);
    }
  };

  const selectedContacts = contacts.filter(c => selectedIds.has(c.id));
  const primaryContact = contacts.find(c => c.id === primaryId);
  const sourceContacts = selectedContacts.filter(c => c.id !== primaryId);

  const totalAddresses = selectedContacts.reduce(
    (sum, c) => sum + c.crypto_addresses.length, 0
  );

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedIds.has(item.id);
    const isPrimary = item.id === primaryId;

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          { 
            backgroundColor: theme.card, 
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => {
          if (step === 'select') {
            toggleSelection(item.id);
          } else if (step === 'primary') {
            setPrimaryId(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
            <Text style={styles.initials}>{getInitials(item.name)}</Text>
          </View>
        )}

        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.addressCount, { color: theme.textSecondary }]}>
            {item.crypto_addresses.length} addresses
          </Text>
        </View>

        {step === 'select' && (
          <View style={[
            styles.checkbox,
            { 
              backgroundColor: isSelected ? theme.primary : 'transparent',
              borderColor: isSelected ? theme.primary : theme.border,
            }
          ]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
        )}

        {step === 'primary' && (
          <View style={[
            styles.radioButton,
            { borderColor: isPrimary ? theme.primary : theme.border }
          ]}>
            {isPrimary && (
              <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderConfirmation = () => (
    <View style={styles.confirmContainer}>
      <View style={[styles.confirmCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.confirmLabel, { color: theme.textSecondary }]}>PRIMARY CONTACT</Text>
        {primaryContact && (
          <View style={styles.confirmItem}>
            {primaryContact.profile_picture ? (
              <Image source={{ uri: primaryContact.profile_picture }} style={styles.confirmAvatar} />
            ) : (
              <View style={[styles.confirmAvatar, { backgroundColor: getAvatarColor(primaryContact.name) }]}>
                <Text style={styles.confirmInitials}>{getInitials(primaryContact.name)}</Text>
              </View>
            )}
            <Text style={[styles.confirmName, { color: theme.text }]}>{primaryContact.name}</Text>
          </View>
        )}
      </View>

      <View style={[styles.confirmCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.confirmLabel, { color: theme.textSecondary }]}>CONTACTS TO MERGE</Text>
        {sourceContacts.map(contact => (
          <View key={contact.id} style={styles.confirmItem}>
            {contact.profile_picture ? (
              <Image source={{ uri: contact.profile_picture }} style={styles.confirmAvatarSmall} />
            ) : (
              <View style={[styles.confirmAvatarSmall, { backgroundColor: getAvatarColor(contact.name) }]}>
                <Text style={styles.confirmInitialsSmall}>{getInitials(contact.name)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.confirmNameSmall, { color: theme.text }]}>{contact.name}</Text>
              <Text style={[styles.confirmAddresses, { color: theme.textSecondary }]}>
                {contact.crypto_addresses.length} addresses
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
          </View>
        ))}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="information-circle" size={24} color={theme.primary} />
        <Text style={[styles.summaryText, { color: theme.text }]}>
          {totalAddresses} addresses will be merged into {primaryContact?.name}.
          {sourceContacts.length} contact(s) will be deleted after merge.
        </Text>
      </View>

      <View style={[styles.warningCard, { backgroundColor: theme.warning + '15' }]}>
        <Ionicons name="warning" size={24} color={theme.warning} />
        <Text style={[styles.warningText, { color: theme.text }]}>
          This action cannot be automatically undone. Please confirm before proceeding.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Merge Contacts</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, { backgroundColor: theme.primary }]} />
        <View style={[
          styles.stepLine, 
          { backgroundColor: step !== 'select' ? theme.primary : theme.border }
        ]} />
        <View style={[
          styles.stepDot, 
          { backgroundColor: step !== 'select' ? theme.primary : theme.border }
        ]} />
        <View style={[
          styles.stepLine, 
          { backgroundColor: step === 'confirm' ? theme.primary : theme.border }
        ]} />
        <View style={[
          styles.stepDot, 
          { backgroundColor: step === 'confirm' ? theme.primary : theme.border }
        ]} />
      </View>

      <View style={styles.stepLabels}>
        <Text style={[styles.stepLabel, { color: theme.primary }]}>Select</Text>
        <Text style={[
          styles.stepLabel, 
          { color: step !== 'select' ? theme.primary : theme.textSecondary }
        ]}>Primary</Text>
        <Text style={[
          styles.stepLabel, 
          { color: step === 'confirm' ? theme.primary : theme.textSecondary }
        ]}>Confirm</Text>
      </View>

      {/* Step Content */}
      <View style={styles.stepContent}>
        {step === 'select' && (
          <>
            <Text style={[styles.instruction, { color: theme.textSecondary }]}>
              Select contacts to merge (at least 2)
            </Text>
            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.id}
                renderItem={renderContactItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}

        {step === 'primary' && (
          <>
            <Text style={[styles.instruction, { color: theme.textSecondary }]}>
              Select the primary contact (addresses will merge into this one)
            </Text>
            <FlatList
              data={selectedContacts}
              keyExtractor={(item) => item.id}
              renderItem={renderContactItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {step === 'confirm' && renderConfirmation()}
      </View>

      {/* Bottom Actions */}
      <View style={[
        styles.bottomActions, 
        { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.background }
      ]}>
        {step !== 'confirm' ? (
          <Button
            title={step === 'select' ? `Continue (${selectedIds.size} selected)` : 'Continue'}
            onPress={handleNext}
            disabled={step === 'select' ? selectedIds.size < 2 : !primaryId}
          />
        ) : (
          <Button
            title="Merge Contacts"
            onPress={handleMerge}
            loading={merging}
            icon="git-merge"
          />
        )}
      </View>
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginTop: 8,
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  addressCount: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  confirmContainer: {
    flex: 1,
  },
  confirmCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  confirmLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  confirmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  confirmAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmInitialsSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmNameSmall: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
  },
  confirmAddresses: {
    fontSize: 12,
    marginLeft: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomActions: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
