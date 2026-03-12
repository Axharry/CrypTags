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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { Button } from '../components/Button';

export default function ScanScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const detectCryptoType = (address: string): string => {
    // Simple detection based on address patterns
    if (address.match(/^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$/) || address.match(/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/)) {
      return 'BTC';
    }
    if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return 'ETH'; // Could also be BNB, MATIC, etc.
    }
    if (address.match(/^T[a-zA-HJ-NP-Z0-9]{33}$/)) {
      return 'TRX';
    }
    if (address.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      return 'SOL';
    }
    return 'ETH'; // Default to ETH
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Parse the scanned data - could be just an address or a URI like "bitcoin:address"
    let address = data;
    let cryptoType = '';

    // Handle common crypto URI schemes
    const uriMatch = data.match(/^(bitcoin|ethereum|solana|tron):([^?]+)/);
    if (uriMatch) {
      const scheme = uriMatch[1].toLowerCase();
      address = uriMatch[2];
      
      const schemeMap: Record<string, string> = {
        bitcoin: 'BTC',
        ethereum: 'ETH',
        solana: 'SOL',
        tron: 'TRX',
      };
      cryptoType = schemeMap[scheme] || '';
    }

    if (!cryptoType) {
      cryptoType = detectCryptoType(address);
    }

    Alert.alert(
      'QR Code Scanned',
      `Address: ${address.slice(0, 20)}...\nDetected: ${cryptoType}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setScanned(false),
        },
        {
          text: 'Add to Contact',
          onPress: () => {
            router.push({
              pathname: '/contact/add',
              params: {
                scannedAddress: address,
                scannedType: cryptoType,
              },
            });
          },
        },
      ]
    );
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Scan QR Code</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.message, { color: theme.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.submessage, { color: theme.textSecondary }]}>
            We need camera access to scan QR codes
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            style={{ marginTop: 24, width: 200 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Scan QR Code</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Overlay with scan area */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructions}>
            Point camera at a QR code containing a crypto address
          </Text>
        </View>
      </View>

      {scanned && (
        <View style={styles.rescanContainer}>
          <Button
            title="Scan Again"
            onPress={() => setScanned(false)}
            variant="secondary"
            icon="refresh"
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
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#6C5CE7',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
  },
});
