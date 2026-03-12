import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { CryptoAddress, DefaultCrypto, CustomCrypto } from '../../types';
import { contactsStorage, cryptosStorage } from '../../services/localStorage';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { validateCryptoAddress } from '../../utils/validation';
import uuid from 'react-native-uuid';

const DEFAULT_AVATARS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

const getAvatarColor = (name: string) => {
  if (!name) return DEFAULT_AVATARS[0];
  const index = name.charCodeAt(0) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function AddContactScreen() {
  const params = useLocalSearchParams<{ scannedAddress?: string; scannedType?: string }>();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<CryptoAddress[]>([]);
  const [cryptos, setCryptos] = useState<(DefaultCrypto | CustomCrypto)[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCryptoSelector, setShowCryptoSelector] = useState(false);

  const loadData = async () => {
    try {
      const cryptosResult = await cryptosStorage.getAll();
      setCryptos([...cryptosResult.default_cryptos, ...cryptosResult.custom_cryptos]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // If coming from QR scan, add the scanned address
    if (params.scannedAddress && params.scannedAddress !== 'undefined') {
      const scannedAddr: CryptoAddress = {
        id: uuid.v4() as string,
        crypto_type: params.scannedType || 'ETH',
        address: params.scannedAddress,
        label: 'Scanned address',
      };
      setAddresses([scannedAddr]);
    }
  }, [params.scannedAddress]);

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
      setProfilePicture(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleRemoveImage = () => {
    setProfilePicture(null);
  };

  const handleAddAddress = (cryptoType: string) => {
    setAddresses([
      ...addresses,
      {
        id: uuid.v4() as string,
        crypto_type: cryptoType,
        address: '',
        label: '',
      },
    ]);
    setShowCryptoSelector(false);
  };

  const handleUpdateAddress = (index: number, field: keyof CryptoAddress, value: string) => {
    const updated = [...addresses];
    updated[index] = { ...updated[index], [field]: value };
    setAddresses(updated);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a contact name');
      return false;
    }

    for (const addr of addresses) {
      if (!addr.address.trim()) {
        Alert.alert('Validation Error', `Please enter an address for ${addr.crypto_type}`);
        return false;
      }
      if (!validateCryptoAddress(addr.address, addr.crypto_type)) {
        Alert.alert(
          'Invalid Address',
          `The ${addr.crypto_type} address format appears to be invalid. Do you want to continue anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => handleSave(true) },
          ]
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = async (skipValidation = false) => {
    if (!skipValidation && !validateForm()) return;

    setLoading(true);
    try {
      await contactsStorage.create({
        name: name.trim(),
        notes: notes.trim() || undefined,
        profile_picture: profilePicture || undefined,
        crypto_addresses: addresses,
        is_favorite: false,
        group_ids: selectedGroupIds,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create contact');
      console.error('Create contact error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Add Contact</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handlePickImage}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(name) }]}>
                  <Text style={styles.initials}>{getInitials(name)}</Text>
                </View>
              )}
              <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            {profilePicture && (
              <TouchableOpacity onPress={handleRemoveImage} style={styles.removeImageButton}>
                <Text style={[styles.removeImageText, { color: theme.error }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Basic Info */}
          <View style={styles.formSection}>
            <Input
              label="Name"
              placeholder="Enter contact name"
              value={name}
              onChangeText={setName}
              icon="person-outline"
            />
            <Input
              label="Notes (Optional)"
              placeholder="Add notes about this contact"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              icon="document-text-outline"
            />
          </View>

          {/* Crypto Addresses */}
          <View style={styles.addressesSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              CRYPTO ADDRESSES
            </Text>

            {addresses.map((addr, index) => (
              <View
                key={addr.id}
                style={[styles.addressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.addressHeader}>
                  <Text style={[styles.cryptoType, { color: theme.primary }]}>
                    {addr.crypto_type}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveAddress(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.error} />
                  </TouchableOpacity>
                </View>

                <Input
                  placeholder="Enter address"
                  value={addr.address}
                  onChangeText={(value) => handleUpdateAddress(index, 'address', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Input
                  placeholder="Label (optional)"
                  value={addr.label || ''}
                  onChangeText={(value) => handleUpdateAddress(index, 'label', value)}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.primary }]}
              onPress={() => setShowCryptoSelector(true)}
            >
              <Ionicons name="add" size={20} color={theme.primary} />
              <Text style={[styles.addButtonText, { color: theme.primary }]}>
                Add Crypto Address
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.saveButtonContainer}>
            <Button
              title="Create Contact"
              onPress={() => handleSave()}
              loading={loading}
              icon="checkmark"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Crypto Selector Modal */}
      {showCryptoSelector && (
        <View style={[styles.selectorOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.selectorContent, { backgroundColor: theme.card }]}>
            <View style={[styles.selectorHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.selectorTitle, { color: theme.text }]}>Select Cryptocurrency</Text>
              <TouchableOpacity onPress={() => setShowCryptoSelector(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.selectorList}>
              {cryptos.map((crypto) => (
                <TouchableOpacity
                  key={crypto.symbol}
                  style={[styles.selectorItem, { borderBottomColor: theme.border }]}
                  onPress={() => handleAddAddress(crypto.symbol)}
                >
                  <Text style={[styles.selectorItemText, { color: theme.text }]}>
                    {crypto.name} ({crypto.symbol})
                  </Text>
                  <Ionicons name="add" size={20} color={theme.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButton: {
    marginTop: 12,
  },
  removeImageText: {
    fontSize: 14,
  },
  formSection: {
    paddingHorizontal: 16,
  },
  addressesSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  addressCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cryptoType: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  saveButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  selectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  selectorContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectorList: {
    maxHeight: 400,
  },
  selectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  selectorItemText: {
    fontSize: 16,
  },
});
