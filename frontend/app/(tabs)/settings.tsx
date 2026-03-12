import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useThemeStore, getTheme } from '../../stores/themeStore';
import { exportStorage } from '../../services/localStorage';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';

const DONATION_URL = 'https://coindrop.to/xolaria';

type ThemeMode = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const { isDark, mode, setMode } = useThemeStore();
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [showDeveloperMemo, setShowDeveloperMemo] = useState(false);

  const handleThemeChange = async (newMode: ThemeMode) => {
    await setMode(newMode);
  };

  const handleSupportCrypTags = async () => {
    try {
      if (Platform.OS === 'web') {
        window.open(DONATION_URL, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(DONATION_URL);
      }
    } catch (error) {
      Linking.openURL(DONATION_URL);
    }
  };

  const handleContactDeveloper = () => {
    const email = 'xolariacorporation@gmail.com';
    const subject = encodeURIComponent('CrypTags Feedback');
    const body = encodeURIComponent('Feedback / suggestion / improvement idea:\n\n');
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(
        'Unable to Open Email',
        'Please send your feedback to xolariacorporation@gmail.com',
        [{ text: 'OK' }]
      );
    });
  };

  const handleShareApp = async () => {
    const shareMessage = 'Check out CrypTags - the best crypto address book! Manage all your crypto contacts in one place. Download now!';
    
    try {
      await Share.share({
        message: shareMessage,
        title: 'Share CrypTags',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const response = format === 'json'
        ? await exportStorage.exportJSON()
        : await exportStorage.exportCSV();

      const content = format === 'json'
        ? JSON.stringify(response, null, 2)
        : (response as { csv_content: string }).csv_content;

      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(content);
        Alert.alert('Success', 'Data copied to clipboard');
      } else {
        await Share.share({
          message: content,
          title: `CrypTags Export (${format.toUpperCase()})`,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all contacts, groups, and settings? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const SettingItem: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }> = ({ icon, title, subtitle, onPress, rightElement, danger }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? theme.error + '20' : theme.surface }]}>
        <Ionicons name={icon} size={20} color={danger ? theme.error : theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: danger ? theme.error : theme.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const ThemeButton: React.FC<{ value: ThemeMode; label: string }> = ({ value, label }) => (
    <TouchableOpacity
      style={[
        styles.themeButton,
        {
          backgroundColor: mode === value ? theme.primary : theme.surface,
          borderColor: mode === value ? theme.primary : theme.border,
        },
      ]}
      onPress={() => handleThemeChange(value)}
    >
      <Text
        style={[
          styles.themeButtonText,
          { color: mode === value ? '#FFFFFF' : theme.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 60 }}
      >
        {/* App Info Banner */}
        <View style={styles.section}>
          <View style={[styles.profileCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
              <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>Privacy First</Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
                All data stored locally on your device
              </Text>
            </View>
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.themeContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemeButton value="light" label="Light" />
            <ThemeButton value="dark" label="Dark" />
            <ThemeButton value="system" label="System" />
          </View>
        </View>

        {/* Crypto Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CRYPTO</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon="add-circle-outline"
              title="Custom Cryptocurrencies"
              subtitle="Add your own crypto types"
              onPress={() => router.push('/cryptos')}
            />
          </View>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon="download-outline"
              title="Export as JSON"
              subtitle="Download contacts in JSON format"
              onPress={() => handleExport('json')}
            />
            <SettingItem
              icon="document-text-outline"
              title="Export as CSV"
              subtitle="Download contacts in CSV format"
              onPress={() => handleExport('csv')}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon="mail-outline"
              title="Contact Developer"
              subtitle="Send feedback or suggestions"
              onPress={handleContactDeveloper}
            />
            <SettingItem
              icon="share-social-outline"
              title="Share App"
              subtitle="Share CrypTags with friends"
              onPress={handleShareApp}
            />
            <SettingItem
              icon="document-text-outline"
              title="Developer Memo"
              subtitle="A message from the creator"
              onPress={() => setShowDeveloperMemo(true)}
            />
          </View>
          <View style={{ height: 12 }} />
          <TouchableOpacity
            style={[styles.donateCard, { backgroundColor: theme.primary }]}
            onPress={handleSupportCrypTags}
            activeOpacity={0.8}
          >
            <View style={styles.donateContent}>
              <View style={styles.donateIconContainer}>
                <Ionicons name="heart" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.donateTextContainer}>
                <Text style={styles.donateTitle}>Support CrypTags</Text>
                <Text style={styles.donateSubtitle}>
                  Support the development through crypto donations
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon="trash-outline"
              title="Clear All Data"
              subtitle="Delete all contacts and settings"
              onPress={handleClearAllData}
              danger
            />
          </View>
        </View>

        <Text style={[styles.version, { color: theme.textSecondary }]}>
          CrypTags v2.0.1 (Offline)
        </Text>
      </ScrollView>

      {/* Developer Memo Modal */}
      <Modal
        visible={showDeveloperMemo}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDeveloperMemo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.memoModal, { backgroundColor: theme.card }]}>
            <View style={styles.memoHeader}>
              <View style={styles.memoHeaderContent}>
                <Ionicons name="heart-circle" size={32} color={theme.primary} />
                <Text style={[styles.memoTitle, { color: theme.text }]}>Developer Memo</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeveloperMemo(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.memoContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.memoText, { color: theme.text }]}>
                Currently (2026), I am <Text style={{ fontWeight: '700', color: theme.primary }}>Axharry</Text>, a management student with a strong fascination for studying crypto and Web3, driven by the belief that the future will be heavily disrupted by these technologies.
              </Text>
              
              <Text style={[styles.memoText, { color: theme.text, marginTop: 16 }]}>
                I have a vision of building a company/startup that focuses intensively on the development of blockchain and cryptography, ultimately evolving into a technology conglomerate capable of turning hundreds of bold and unconventional ideas into reality, ideas that have the potential to reshape the world.
              </Text>
              
              <Text style={[styles.memoText, { color: theme.text, marginTop: 16 }]}>
                I draw a great deal of inspiration from a young man with glasses, a crypto figure who is quite well known in my country. His journey motivates me to create meaningful impact and contribute value to society.
              </Text>
              
              <View style={{ height: 90 }} />
              <View style={styles.memoLogoContainer}>
                <Image 
                  source={{ uri: 'https://customer-assets.emergentagent.com/job_repo-to-app-builder/artifacts/6q5n49xt_CT.png' }}
                  style={styles.memoLogo}
                  contentFit="contain"
                />
              </View>
              <View style={{ height: 90 }} />
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.memoCloseButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowDeveloperMemo(false)}
            >
              <Text style={styles.memoCloseButtonText}>Close</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  themeContainer: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 32,
  },
  donateCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  donateContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donateTextContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  donateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  donateSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageNative: {
    fontSize: 13,
    marginTop: 2,
  },
  // Developer Memo Modal Styles
  memoModal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memoHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memoTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  memoContent: {
    padding: 24,
    maxHeight: 500,
  },
  memoText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'justify',
  },
  memoLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoLogo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  memoCloseButton: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  memoCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
