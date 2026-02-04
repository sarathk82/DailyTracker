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
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { P2PSyncService, PairedDevice } from '../services/P2PSyncService';
import { CameraView, Camera } from 'expo-camera';

export const DevicePairingScreen: React.FC = () => {
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
  const [isWebScanning, setIsWebScanning] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const webScannerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dynamicStyles = getStyles(theme);

  useEffect(() => {
    initializeP2P();
    loadPairedDevices();

    // Setup sync callback
    P2PSyncService.onSync((data) => {
      setSyncing(false);
      Alert.alert('Sync Complete', `Synced ${data.entries.length} entries`);
    });

    P2PSyncService.onPeerOnline((deviceId) => {
      Alert.alert('Device Online', 'Paired device is now online');
    });

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    return () => {
      P2PSyncService.disconnect();
    };
  }, []);

  // Web scanner effect
  useEffect(() => {
    if (Platform.OS === 'web' && isWebScanning && showScanner) {
      // Dynamically import html5-qrcode only on web
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const html5QrCode = new Html5Qrcode("qr-reader");
        
        html5QrCode.start(
          { facingMode: "environment" }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          async (decodedText) => {
            // QR Code scanned successfully - prevent duplicate scans
            if (isScanning) {
              console.log('Already processing a scan, ignoring duplicate');
              return;
            }
            
            console.log('Processing QR code scan (web)...');
            
            // Clear any existing timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            
            setIsScanning(true);
            html5QrCode.stop();
            setShowScanner(false);
            setIsWebScanning(false);
            
            const resetState = () => {
              setIsScanning(false);
              setLoading(false);
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            };
            
            try {
              setLoading(true);
              await P2PSyncService.pairDevice(decodedText);
              await loadPairedDevices();
              console.log('Device paired successfully (web), showing alert');
              
              Alert.alert(
                'Device Paired',
                'Device paired successfully! Both devices must be running the app. Click "Sync Now" to transfer data.',
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    console.log('Alert dismissed by user (web)');
                    resetState();
                  } 
                }]
              );
              
              // Fallback: reset after 2 seconds in case alert is dismissed another way
              timeoutRef.current = setTimeout(() => {
                console.log('Fallback timeout: resetting state (web)');
                resetState();
              }, 2000);
            } catch (error: any) {
              console.error('Pairing error (web):', error.message);
              Alert.alert('Pairing Error', error.message, [
                { 
                  text: 'OK', 
                  onPress: () => {
                    console.log('Error alert dismissed by user (web)');
                    resetState();
                  } 
                }
              ]);
              
              // Fallback: reset after 1.5 seconds
              timeoutRef.current = setTimeout(() => {
                console.log('Fallback timeout: resetting state after error (web)');
                resetState();
              }, 1500);
            }
          },
          (errorMessage) => {
            // Scanning errors (can be ignored - happens continuously)
          }
        ).catch((err) => {
          console.error('Failed to start scanner:', err);
          Alert.alert('Camera Error', 'Could not access camera. Please try manual entry.');
          setShowScanner(false);
          setIsWebScanning(false);
          setShowManualInput(true);
        });

        // Cleanup function
        return () => {
          html5QrCode.stop().catch(err => console.error('Error stopping scanner:', err));
        };
      });
    }
  }, [isWebScanning, showScanner]);

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
    if (Platform.OS === 'web') {
      // Check if mobile browser (has camera support)
      const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobileBrowser) {
        // Mobile web browser - try to use camera
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          stream.getTracks().forEach(track => track.stop()); // Stop the test stream
          setShowScanner(true);
          setIsWebScanning(true);
        } catch (error) {
          // Camera not available or permission denied - fall back to manual input
          Alert.alert(
            'Camera Not Available',
            'Please allow camera access or use manual entry',
            [
              { text: 'Manual Entry', onPress: () => setShowManualInput(true) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      } else {
        // Desktop browser - show manual input
        setShowManualInput(true);
      }
    } else {
      // Native mobile: Request camera permission and show scanner
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        setShowScanner(true);
        setIsWebScanning(false);
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access to scan QR codes',
          [
            { text: 'Manual Entry', onPress: () => setShowManualInput(true) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent duplicate scans
    if (isScanning) {
      console.log('Already processing a scan, ignoring duplicate');
      return;
    }
    
    console.log('Processing QR code scan...');
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsScanning(true);
    setShowScanner(false);
    
    const resetState = () => {
      setIsScanning(false);
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    
    try {
      setLoading(true);
      await P2PSyncService.pairDevice(data);
      await loadPairedDevices();
      console.log('Device paired successfully, showing alert');
      
      Alert.alert(
        'Device Paired',
        'Device paired successfully! Use Export/Import to sync data between devices (P2P sync only works on web browsers).',
        [{ 
          text: 'OK', 
          onPress: () => {
            console.log('Alert dismissed by user');
            resetState();
          } 
        }]
      );
      
      // Fallback: reset after 2 seconds in case alert is dismissed another way
      timeoutRef.current = setTimeout(() => {
        console.log('Fallback timeout: resetting state');
        resetState();
      }, 2000);
    } catch (error: any) {
      console.error('Pairing error:', error.message);
      
      // Show user-friendly error message
      let errorMessage = error.message;
      if (errorMessage.includes('WebRTC') || errorMessage.includes('browser')) {
        errorMessage = 'P2P sync is not available in mobile apps. Use Export/Import feature to sync data between devices.';
      }
      
      Alert.alert('Pairing Info', errorMessage, [
        { 
          text: 'OK', 
          onPress: () => {
            console.log('Error alert dismissed by user');
            resetState();
          } 
        }
      ]);
      
      // Fallback: reset after 1.5 seconds
      timeoutRef.current = setTimeout(() => {
        console.log('Fallback timeout: resetting state after error');
        resetState();
      }, 1500);
    }
  };

  const handleManualPair = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a pairing code');
      return;
    }

    try {
      setLoading(true);
      setShowManualInput(false);
      await P2PSyncService.pairDevice(manualCode);
      await loadPairedDevices();
      
      Alert.alert(
        'Device Paired',
        'Device paired successfully! Both devices must be running the app. Click "Sync Now" to transfer data.'
      );
      
      setManualCode('');
      setLoading(false);
    } catch (error: any) {
      Alert.alert('Pairing Error', error.message);
      setLoading(false);
    }
  };

  const handleSyncWithDevice = async (deviceId: string) => {
    try {
      setSyncing(true);
      await P2PSyncService.syncWithDevice(deviceId);
    } catch (error) {
      Alert.alert('Sync Failed', 'Could not sync with device');
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
            <Text style={[dynamicStyles.warningTitle, { color: '#0D47A1' }]}>How P2P Sync Works:</Text>
            <Text style={[dynamicStyles.warningText, { color: '#0D47A1' }]}>
              1. Both devices must be running the app{'\n'}
              2. Scan QR code to pair devices{'\n'}
              3. Click "Sync Now" on device with data to send{'\n'}
              4. Other device will receive all entries
            </Text>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={dynamicStyles.qrSection}>
          <Text style={dynamicStyles.sectionTitle}>Show This QR Code</Text>
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
            <Text style={dynamicStyles.warningIcon}>⚠️</Text>
            <View style={dynamicStyles.warningTextContainer}>
              <Text style={dynamicStyles.warningTitle}>How to pair:</Text>
              <Text style={dynamicStyles.warningText}>
                1. On your other device, open Smpl Journal and tap "Scan QR Code to Pair"
              </Text>
              <Text style={dynamicStyles.warningText}>
                2. Point the camera at this QR code
              </Text>
              <Text style={dynamicStyles.warningText}>
                3. Works on native apps AND mobile web browsers!
              </Text>
            </View>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={dynamicStyles.scanButton}
          onPress={handleScanQRCode}
        >
          <Text style={dynamicStyles.scanButtonText}>
            📸 Scan QR Code to Pair
          </Text>
        </TouchableOpacity>

        {/* Paired Devices */}
        {pairedDevices.length > 0 && (
          <View style={dynamicStyles.pairedSection}>
            <Text style={dynamicStyles.sectionTitle}>Paired Devices</Text>
            {pairedDevices.map((device) => (
              <View key={device.id} style={dynamicStyles.deviceCard}>
                <View>
                  <Text style={dynamicStyles.deviceName}>{device.name}</Text>
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
                  style={dynamicStyles.syncButton}
                  onPress={() => handleSyncWithDevice(device.id)}
                  disabled={syncing}
                >
                  <Text style={dynamicStyles.syncButtonText}>
                    {syncing ? '⏳' : '🔄'} Sync
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View style={dynamicStyles.infoSection}>
          <Text style={dynamicStyles.infoTitle}>How it works:</Text>
          <Text style={dynamicStyles.infoText}>
            • No login required - completely private
          </Text>
          <Text style={dynamicStyles.infoText}>
            • Data syncs directly between your devices
          </Text>
          <Text style={dynamicStyles.infoText}>
            • No cloud storage - your data never leaves your devices
          </Text>
          <Text style={dynamicStyles.infoText}>
            • Auto-sync when both devices are online
          </Text>
          <Text style={dynamicStyles.infoText}>
            • Works offline after initial sync
          </Text>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      {showScanner && !isWebScanning && (
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
              onBarcodeScanned={handleBarCodeScanned}
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

      {/* Web QR Scanner Modal */}
      {showScanner && isWebScanning && Platform.OS === 'web' && (
        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => {
            setShowScanner(false);
            setIsWebScanning(false);
          }}
        >
          <SafeAreaView style={dynamicStyles.scannerContainer}>
            <View style={dynamicStyles.scannerHeader}>
              <Text style={dynamicStyles.scannerTitle}>Scan QR Code</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowScanner(false);
                  setIsWebScanning(false);
                }}
                style={dynamicStyles.closeButton}
              >
                <Text style={dynamicStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={dynamicStyles.webScannerContainer}>
              {/* This will be rendered as HTML video element */}
              {Platform.OS === 'web' && (
                // @ts-ignore - Web-only HTML element
                <div 
                  ref={webScannerRef}
                  id="qr-reader" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '500px',
                    margin: '0 auto'
                  }}
                />
              )}
            </View>
            <View style={dynamicStyles.scannerFooter}>
              <TouchableOpacity
                style={dynamicStyles.manualButton}
                onPress={() => {
                  setShowScanner(false);
                  setIsWebScanning(false);
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
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
