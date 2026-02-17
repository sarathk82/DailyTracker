import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { P2PSyncService, PairedDevice } from '../services/P2PSyncService';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';

export const DevicePairingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [deviceId, setDeviceId] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const alertShownRef = useRef(false);

  const dynamicStyles = getStyles(theme);

  useEffect(() => {
    initializeP2P();
    loadPairedDevices();

    // Setup sync callback to reload data silently (no alert on receiving device)
    P2PSyncService.onSync((data) => {
      setSyncing(false);
      console.log('✅ Sync received:', data.entries.length, 'entries,', data.expenses.length, 'expenses,', data.actionItems.length, 'tasks');
      
      // Just refresh the UI silently - no alert, no navigation
      // The device that initiated the sync will show the success alert
    });

    P2PSyncService.onPeerOnline((deviceId) => {
      console.log('🟢 Device connected:', deviceId);
      // Just log, don't show alert to avoid alert stacking
    });

    // Cleanup and disconnect on unmount
    return () => {
      P2PSyncService.disconnect();
    };
  }, []);

  const initializeP2P = async () => {
    try {
      const id = await P2PSyncService.initialize();
      setDeviceId(id);
      
      const code = await P2PSyncService.generatePairingCode();
      setPairingCode(code);
      
      // Auto-connect to paired devices
      await P2PSyncService.autoConnectPairedDevices();
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize P2P:', error);
      setLoading(false);
    }
  };

  const loadPairedDevices = async () => {
    const devices = await P2PSyncService.getPairedDevices();
    
    // Deduplicate devices by ID (defensive measure)
    const uniqueDevices = Array.from(
      new Map(devices.map(device => [device.id, device])).values()
    );
    
    // Sort by most recently paired
    const sortedDevices = uniqueDevices.sort((a, b) => 
      new Date(b.pairedAt).getTime() - new Date(a.pairedAt).getTime()
    );
    
    setPairedDevices(sortedDevices);
  };

  const handleScanQRCode = async () => {
    // Only allow scanning on mobile apps
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'QR code scanning is only available on mobile apps. On desktop, you display the QR code for mobile to scan.'
      );
      return;
    }
    
    // Native mobile: Request camera permission and show scanner
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status === 'granted') {
      setShowScanner(true);
    } else {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access to scan QR codes. You can also try manual entry.',
        [
          { text: 'Manual Entry', onPress: () => setShowManualInput(true) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent duplicate scans
    if (isScanning) {
      console.log('Already processing a scan, ignoring duplicate');
      return;
    }
    
    console.log('Processing QR code scan...');
    console.log('Raw QR data:', data);
    console.log('QR data length:', data.length);
    console.log('QR data type:', typeof data);
    
    setIsScanning(true);
    setShowScanner(false);
    setLoading(true);
    
    try {
      // Validate and parse JSON first
      let pairingData;
      try {
        pairingData = JSON.parse(data);
        console.log('Parsed pairing data:', pairingData);
      } catch (parseError) {
        throw new Error('Invalid QR code format. Please scan the QR code from the desktop app.');
      }
      
      // Validate required fields
      if (!pairingData.deviceId || !pairingData.syncKey) {
        throw new Error('QR code is missing required information. Please generate a new QR code on desktop.');
      }
      
      // Pair the device
      console.log('Pairing device...');
      await P2PSyncService.pairDevice(data);
      await loadPairedDevices();
      
      const pairedDeviceId = pairingData.deviceId;
      console.log('[DevicePairing] Device paired, starting auto-sync...');
      console.log('[DevicePairing] Target device ID:', pairedDeviceId);
      
      // Auto-sync immediately after pairing
      console.log('[DevicePairing] Calling P2PSyncService.syncWithDevice...');
      await P2PSyncService.syncWithDevice(pairedDeviceId);
      console.log('[DevicePairing] P2PSyncService.syncWithDevice completed');
      
      // Success!
      setLoading(false);
      setIsScanning(false);
      
      // Show alert only once
      if (!alertShownRef.current) {
        alertShownRef.current = true;
        Alert.alert(
          '✓ Synced!',
          'Data synced successfully! Use "Sync Now" button anytime to resync.',
          [
            { 
              text: 'OK',
              onPress: () => {
                alertShownRef.current = false;
                // Navigate to show the paired devices list
                setShowScanner(false);
              }
            }
          ]
        );
      }
      
    } catch (error: any) {
      console.error('[DevicePairing] Scan and sync error:', error);
      console.error('[DevicePairing] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      setLoading(false);
      setIsScanning(false);
      
      // Show error alert only once
      if (!alertShownRef.current) {
        alertShownRef.current = true;
        Alert.alert(
          'Sync Error',
          `${error.message || 'Could not sync'}`,
          [
            { 
              text: 'OK',
              onPress: () => {
                alertShownRef.current = false;
              }
            }
          ]
        );
      }
    }
  };

  const handleManualPair = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a pairing code');
      return;
    }

    try {
      console.log('[DevicePairing] Manual pairing started...');
      setLoading(true);
      setShowManualInput(false);
      await P2PSyncService.pairDevice(manualCode);
      await loadPairedDevices();
      
      // Parse the pairing code to get device ID for auto-sync
      const pairingData = JSON.parse(manualCode);
      console.log('[DevicePairing] Manual pair - device ID:', pairingData.deviceId);
      
      // Auto-sync after pairing
      console.log('[DevicePairing] Starting auto-sync after manual pairing...');
      await P2PSyncService.syncWithDevice(pairingData.deviceId);
      console.log('[DevicePairing] Manual pair sync completed');
      
      Alert.alert(
        'Device Paired & Synced',
        'Device paired and data synced successfully! Use "Sync Now" button for future syncs.'
      );
      
      setManualCode('');
      setLoading(false);
    } catch (error: any) {
      console.error('[DevicePairing] Manual pairing error:', error);
      Alert.alert('Pairing Error', error.message);
      setLoading(false);
    }
  };

  const handleClearAllDevices = async () => {
    Alert.alert(
      'Clear All Paired Devices?',
      'This will remove all device pairings. You can always pair them again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear from storage
              await AsyncStorage.removeItem('@paired_devices');
              // Also clear all sync keys
              const devices = await P2PSyncService.getPairedDevices();
              for (const device of devices) {
                await AsyncStorage.removeItem(`@sync_key_${device.id}`);
              }
              await loadPairedDevices();
              Alert.alert('Success', 'All devices cleared');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to clear devices: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleSyncWithDevice = async (deviceId: string) => {
    try {
      console.log('[DevicePairing] Starting bidirectional sync with device:', deviceId);
      setSyncing(true);
      
      // Bidirectional sync: send our data and request their data
      await P2PSyncService.syncBidirectional(deviceId);
      
      console.log('[DevicePairing] Bidirectional sync completed successfully');
      // Success message only on device that clicked the button
      Alert.alert(
        '✓ Sync Complete',
        'Data synchronized successfully on both devices.',
        [{ text: 'OK' }]
      );
      setSyncing(false);
    } catch (error: any) {
      console.error('[DevicePairing] Sync error:', error);
      Alert.alert('Sync Failed', error.message || 'Could not sync with device');
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={dynamicStyles.loadingText}>Initializing P2P...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
        <Text style={dynamicStyles.title}>Device Pairing</Text>
        <Text style={dynamicStyles.subtitle}>
          Pair devices to sync your journal entries peer-to-peer
        </Text>

        {/* How P2P Sync Works */}
        <View style={[dynamicStyles.warningBox, { backgroundColor: '#E3F2FD', borderColor: '#2196F3', marginBottom: 20 }]}>
          <Text style={[dynamicStyles.warningIcon, { fontSize: 24 }]}>ℹ️</Text>
          <View style={dynamicStyles.warningTextContainer}>
            <Text style={[dynamicStyles.warningTitle, { color: '#0D47A1' }]}>WhatsApp-Style Sync:</Text>
            <Text style={[dynamicStyles.warningText, { color: '#0D47A1' }]}>
              {Platform.OS === 'web' 
                ? '1. Show QR code below\n2. Scan with mobile app\n3. Data syncs automatically!\n4. Works with any mobile app!' 
                : '1. Scan desktop QR code\n2. Data syncs automatically!\n3. Like WhatsApp!\n4. Works on native app too!'}
            </Text>
          </View>
        </View>

        {/* QR Code Section - Web Only */}
        {Platform.OS === 'web' && (
          <View style={dynamicStyles.qrSection}>
            <Text style={dynamicStyles.sectionTitle}>Show This QR Code to Mobile App</Text>
            <View style={dynamicStyles.qrContainer}>
              <QRCode
                value={pairingCode}
                size={200}
                backgroundColor="white"
                color={theme.primary}
              />
            </View>
            <Text style={dynamicStyles.deviceId}>
              Device ID: {deviceId.substring(0, 12)}...
            </Text>
            
            {/* Important Notice */}
            <View style={dynamicStyles.warningBox}>
              <Text style={dynamicStyles.warningIcon}>📱</Text>
              <View style={dynamicStyles.warningTextContainer}>
                <Text style={dynamicStyles.warningTitle}>Automatic Sync:</Text>
                <Text style={dynamicStyles.warningText}>
                  Scan this QR code with your mobile app. Data will sync automatically to this desktop - just like WhatsApp!
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Mobile Instructions - Mobile Only */}
        {Platform.OS !== 'web' && (
          <View style={dynamicStyles.mobileInstructions}>
            <Text style={dynamicStyles.sectionTitle}>Quick Sync to Desktop</Text>
            <View style={[dynamicStyles.warningBox, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}>
              <Text style={[dynamicStyles.warningIcon, { fontSize: 32 }]}>✓</Text>
              <View style={dynamicStyles.warningTextContainer}>
                <Text style={[dynamicStyles.warningTitle, { color: '#2E7D32' }]}>Native App Sync Enabled!</Text>
                <Text style={[dynamicStyles.warningText, { color: '#2E7D32' }]}>
                  1. Scan the QR code from your desktop\n2. Data syncs automatically!\n3. Check Journal tab on desktop\n4. That's it - just like WhatsApp!
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Scan Button - Mobile Only */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={dynamicStyles.scanButton}
            onPress={handleScanQRCode}
          >
            <Text style={dynamicStyles.scanButtonText}>
              📸 Scan QR Code from Desktop
            </Text>
          </TouchableOpacity>
        )}

        {/* Paired Devices */}
        {pairedDevices.length > 0 && (
          <View style={dynamicStyles.pairedSection}>
            <View style={dynamicStyles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Paired Devices</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={loadPairedDevices}>
                  <Text style={{ fontSize: 18 }}>🔄</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClearAllDevices}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
            {pairedDevices.map((device) => {
              const status = P2PSyncService.getConnectionStatus(device.id);
              const statusMessage = P2PSyncService.getStatusMessage(device.id);
              // Sync is always available via Firebase relay, even without WebRTC connection
              const canSync = true;
              
              return (
                <View key={device.id} style={dynamicStyles.deviceCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={dynamicStyles.deviceName}>{device.name}</Text>
                    <Text style={dynamicStyles.deviceStatus}>{statusMessage}</Text>
                    <Text style={dynamicStyles.deviceInfo}>
                      Paired: {new Date(device.pairedAt).toLocaleDateString()}
                    </Text>
                    {device.lastSyncAt && (
                      <Text style={dynamicStyles.deviceInfo}>
                        Last sync: {new Date(device.lastSyncAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      dynamicStyles.syncButton,
                      syncing && dynamicStyles.syncButtonDisabled
                    ]}
                    onPress={() => handleSyncWithDevice(device.id)}
                    disabled={syncing}
                  >
                    <Text style={dynamicStyles.syncButtonText}>
                      {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Info Section */}
        <View style={dynamicStyles.infoSection}>
          <Text style={dynamicStyles.infoTitle}>How it works:</Text>
          <Text style={dynamicStyles.infoText}>
            • No login required - completely private
          </Text>
          <Text style={dynamicStyles.infoText}>
            • Sync from mobile app ↔ desktop web browser
          </Text>
          <Text style={dynamicStyles.infoText}>
            • End-to-end encrypted data transfer
          </Text>
          <Text style={dynamicStyles.infoText}>
            • {Platform.OS === 'web' ? 'Display QR code for mobile to scan' : 'Scan QR code from desktop browser'}
          </Text>
          <Text style={dynamicStyles.infoText}>
            • First sync happens automatically after pairing
          </Text>
          <Text style={dynamicStyles.infoText}>
            • Use "Sync Now" button anytime to resync (no need to scan QR again)
          </Text>
        </View>
      </ScrollView>

      {/* QR Scanner Modal - Native Mobile Only */}
      {showScanner && (
        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <SafeAreaView style={dynamicStyles.scannerContainer}>
            <View style={dynamicStyles.scannerHeader}>
              <Text style={dynamicStyles.scannerTitle}>Scan QR Code</Text>
              <TouchableOpacity
                onPress={() => setShowScanner(false)}
                style={dynamicStyles.closeButton}
              >
                <Text style={dynamicStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <CameraView
              style={dynamicStyles.camera}
              onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            <View style={dynamicStyles.scannerFooter}>
              <TouchableOpacity
                style={dynamicStyles.manualButton}
                onPress={() => {
                  setShowScanner(false);
                  setShowManualInput(true);
                }}
              >
                <Text style={dynamicStyles.manualButtonText}>
                  Enter Code Manually
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Manual Input Modal */}
      {showManualInput && (
        <Modal
          visible={showManualInput}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowManualInput(false)}
        >
          <View style={dynamicStyles.modalOverlay}>
            <View style={dynamicStyles.modalContent}>
              <Text style={dynamicStyles.modalTitle}>Enter Pairing Code</Text>
              <Text style={dynamicStyles.modalSubtitle}>
                Paste the pairing code from the other device
              </Text>
              <TextInput
                style={dynamicStyles.codeInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Paste code here..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                autoFocus
              />
              <View style={dynamicStyles.modalButtons}>
                <TouchableOpacity
                  style={[dynamicStyles.modalButton, dynamicStyles.cancelButton]}
                  onPress={() => {
                    setShowManualInput(false);
                    setManualCode('');
                  }}
                >
                  <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[dynamicStyles.modalButton, dynamicStyles.pairButton]}
                  onPress={handleManualPair}
                  disabled={!manualCode.trim()}
                >
                  <Text style={dynamicStyles.pairButtonText}>Pair Device</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 20,
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    qrSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    mobileInstructions: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    deviceStatus: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 2,
    },
    qrContainer: {
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 16,
      marginBottom: 16,
    },
    deviceId: {
      fontSize: 12,
      color: theme.textSecondary,
      fontFamily: 'monospace',
    },
    warningBox: {
      flexDirection: 'row',
      backgroundColor: '#FFF3CD',
      borderLeftWidth: 4,
      borderLeftColor: '#FFA000',
      padding: 12,
      borderRadius: 8,
      marginTop: 16,
      maxWidth: 350,
    },
    warningIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    warningTextContainer: {
      flex: 1,
    },
    warningTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#8B6914',
      marginBottom: 4,
    },
    warningText: {
      fontSize: 13,
      color: '#8B6914',
      lineHeight: 18,
      marginBottom: 4,
    },
    scanButton: {
      backgroundColor: theme.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 32,
    },
    scanButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    pairedSection: {
      marginBottom: 32,
    },
    deviceCard: {
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    deviceName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    deviceInfo: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    syncButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    syncButtonDisabled: {
      backgroundColor: theme.textSecondary,
      opacity: 0.6,
    },
    syncButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    infoSection: {
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    scannerContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scannerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    scannerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 20,
      color: theme.text,
      fontWeight: 'bold',
    },
    camera: {
      flex: 1,
    },
    webScannerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.background,
    },
    scannerFooter: {
      padding: 20,
      backgroundColor: theme.surface,
    },
    manualButton: {
      backgroundColor: theme.input,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    manualButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
    codeInput: {
      backgroundColor: theme.input,
      borderRadius: 12,
      padding: 16,
      fontSize: 14,
      color: theme.text,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 20,
      fontFamily: 'monospace',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.input,
    },
    cancelButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
    pairButton: {
      backgroundColor: theme.primary,
    },
    pairButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });
