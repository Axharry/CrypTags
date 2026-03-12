import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { Button } from '../components/Button';

export default function ScanScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Try to detect crypto type from address format
    let detectedType = 'ETH';
    let cleanAddress = data;

    // Check for common crypto URI formats
    if (data.startsWith('bitcoin:')) {
      detectedType = 'BTC';
      cleanAddress = data.replace('bitcoin:', '').split('?')[0];
    } else if (data.startsWith('ethereum:')) {
      detectedType = 'ETH';
      cleanAddress = data.replace('ethereum:', '').split('?')[0];
    } else if (data.startsWith('solana:')) {
      detectedType = 'SOL';
      cleanAddress = data.replace('solana:', '').split('?')[0];
    } else if (data.startsWith('0x') && data.length === 42) {
      detectedType = 'ETH';
    } else if (data.startsWith('bc1') || data.startsWith('1') || data.startsWith('3')) {
      if (/^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(data)) {
        detectedType = 'BTC';
      }
    } else if (data.startsWith('T') && data.length === 34) {
      detectedType = 'TRX';
    } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data)) {
      detectedType = 'SOL';
    }

    Alert.alert(
      'QR Code Scanned',
      `Detected: ${detectedType} address\n\n${cleanAddress.substring(0, 20)}...`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setScanned(false),
        },
        {
          text: 'Add to New Contact',
          onPress: () => {
            router.replace({
              pathname: '/contact/add',
              params: { scannedAddress: cleanAddress, scannedType: detectedType },
            });
          },
        },
      ]
    );
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loader}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Scan QR Code</Text>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionSubtitle, { color: theme.textSecondary }]}>
            We need camera access to scan QR codes containing crypto addresses
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            icon="camera"
            style={{ marginTop: 24, width: '80%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Scan QR Code</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.permissionContainer}>
          <Ionicons name="information-circle-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            QR Scanning
          </Text>
          <Text style={[styles.permissionSubtitle, { color: theme.textSecondary }]}>
            For the best experience, please use the mobile app to scan QR codes.
            Alternatively, you can manually add addresses.
          </Text>
          <Button
            title="Add Contact Manually"
            onPress={() => router.replace('/contact/add')}
            icon="add"
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Scan QR Code</Text>
        <TouchableOpacity
          onPress={() => setFlashEnabled(!flashEnabled)}
          style={styles.flashButton}
        >
          <Ionicons
            name={flashEnabled ? 'flash' : 'flash-off'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        enableTorch={flashEnabled}
      >
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructionText}>
            Point camera at a QR code containing a crypto address
          </Text>
        </View>
      </CameraView>

      {scanned && (
        <View style={styles.rescanContainer}>
          <Button
            title="Scan Again"
            onPress={() => setScanned(false)}
            icon="refresh"
            style={{ marginHorizontal: 24 }}
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  flashButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#6C5CE7',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 32,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  rescanContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
});
