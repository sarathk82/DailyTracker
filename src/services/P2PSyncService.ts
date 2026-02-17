import Peer, { DataConnection } from 'peerjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ref, set, onValue, remove, get } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Entry, Expense, ActionItem } from '../types';
import { StorageService } from '../utils/storage';
import { encryptData, decryptData } from '../utils/encryption';

const DEVICE_ID_KEY = '@device_id';
const PAIRED_DEVICES_KEY = '@paired_devices';
const SYNC_KEY_KEY = '@sync_key';

export interface PairedDevice {
  id: string;
  name: string;
  pairedAt: string;
  lastSyncAt?: string;
}

export interface SyncData {
  entries: Entry[];
  expenses: Expense[];
  actionItems: ActionItem[];
  timestamp: string;
}

/**
 * P2P Sync Service - No login required, WhatsApp-style device pairing
 * Uses PeerJS for signaling and WebRTC for P2P data transfer
 */
export class P2PSyncService {
  private static peer: Peer | null = null;
  private static deviceId: string | null = null;
  private static syncKey: string | null = null;
  private static connections: Map<string, DataConnection> = new Map();
  private static onSyncCallback: ((data: SyncData) => void) | null = null;
  private static onPeerOnlineCallback: ((deviceId: string) => void) | null = null;
  private static onDataRefreshCallback: (() => void) | null = null;

  /**
   * Initialize P2P service - get or create device ID
   */
  static async initialize(): Promise<string> {
    // Get or create device ID
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate anonymous device ID
      deviceId = this.generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    this.deviceId = deviceId;

    // Get or create sync encryption key
    let syncKey = await AsyncStorage.getItem(SYNC_KEY_KEY);
    if (!syncKey) {
      syncKey = this.generateSyncKey();
      await AsyncStorage.setItem(SYNC_KEY_KEY, syncKey);
    }
    this.syncKey = syncKey;

    // Initialize PeerJS connection (web only)
    await this.connectToPeerNetwork();
    
    // Initialize Firebase relay listener (all platforms can now receive data)
    this.initializeFirebaseRelay();

    return deviceId;
  }

  /**
   * Connect to PeerJS signaling server
   */
  private static async connectToPeerNetwork(): Promise<void> {
    // Skip PeerJS on native mobile - not supported
    if (Platform.OS !== 'web') {
      return;
    }

    if (this.peer) {
      this.peer.destroy();
    }

    try {
      // Use free PeerJS cloud server
      this.peer = new Peer(this.deviceId!, {
        debug: 0, // Disable logging
      });

      this.peer.on('open', (id) => {
        // Connected successfully
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (error) => {
        console.error('Peer error:', error);
        // Don't throw - allow app to continue without P2P
      });
    } catch (error) {
      console.error('Failed to initialize PeerJS:', error);
      // Don't throw - app can still work without P2P sync
    }
  }

  /**
   * Check if P2P sync is available on this platform
   */
  static isP2PAvailable(): boolean {
    return Platform.OS === 'web';
  }

  /**
   * Generate pairing QR code data
   */
  static async generatePairingCode(): Promise<string> {
    if (!this.deviceId || !this.syncKey) {
      await this.initialize();
    }

    const pairingData = {
      deviceId: this.deviceId,
      syncKey: this.syncKey,
      deviceName: await this.getDeviceName(),
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(pairingData);
  }

  /**
   * Pair with another device by scanning their QR code
   */
  static async pairDevice(qrData: string): Promise<void> {
    try {
      console.log('Attempting to pair with QR data:', qrData);
      const pairingData = JSON.parse(qrData);
      console.log('Parsed pairing data:', pairingData);
      
      const { deviceId, syncKey, deviceName } = pairingData;

      // Validate required fields
      if (!deviceId || !syncKey) {
        throw new Error('Missing required pairing information (deviceId or syncKey)');
      }

      // Store paired device
      const pairedDevice: PairedDevice = {
        id: deviceId,
        name: deviceName || 'Unknown Device',
        pairedAt: new Date().toISOString(),
      };

      const pairedDevices = await this.getPairedDevices();
      
      // Check if device is already paired
      if (pairedDevices.some(d => d.id === deviceId)) {
        console.log('Device already paired, updating...');
        const index = pairedDevices.findIndex(d => d.id === deviceId);
        pairedDevices[index] = pairedDevice;
      } else {
        pairedDevices.push(pairedDevice);
      }
      
      await AsyncStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(pairedDevices));

      // Store the shared sync key for this device
      await AsyncStorage.setItem(`@sync_key_${deviceId}`, syncKey);

      // Send our pairing info back via Firebase Relay for bidirectional pairing
      // IMPORTANT: We send back the SAME shared syncKey, not our own different key
      try {
        console.log('[DevicePairing] Sending pairing confirmation to:', deviceId);
        await this.sendPairingConfirmation(deviceId, syncKey);
      } catch (error) {
        console.error('[DevicePairing] Failed to send pairing confirmation:', error);
        // Continue anyway - at least we have their key
      }

      // Try to connect to the device (will succeed only if WebRTC is available)
      try {
        await this.connectToDevice(deviceId);
      } catch (error) {
        console.log('Could not establish connection (WebRTC may not be available), but device is paired');
      }

      console.log('Device paired successfully:', deviceName);
    } catch (error) {
      console.error('Failed to pair device:', error);
      if (error instanceof SyntaxError) {
        throw new Error('Invalid QR code format - not valid JSON');
      }
      throw new Error(error instanceof Error ? error.message : 'Invalid pairing code');
    }
  }

  /**
   * Send pairing confirmation back to the device that shared the QR code
   * This enables bidirectional pairing so both devices have each other's sync keys
   */
  private static async sendPairingConfirmation(targetDeviceId: string, sharedSyncKey: string): Promise<void> {
    try {
      // Ensure we have our own device ID
      if (!this.deviceId) {
        await this.initialize();
      }
      
      const pairingConfirmation = {
        type: 'pairing_confirmation',
        fromDevice: this.deviceId,
        deviceName: await this.getDeviceName(),
        syncKey: sharedSyncKey,  // Use the shared key from QR code, not our own
        timestamp: Date.now()
      };
      
      console.log('[DevicePairing] Uploading pairing confirmation to Firebase...');
      const syncRef = ref(realtimeDb, `sync/${targetDeviceId}`);
      await set(syncRef, pairingConfirmation);
      console.log('[DevicePairing] ✓ Pairing confirmation sent');
    } catch (error) {
      console.error('[DevicePairing] Error sending pairing confirmation:', error);
      throw error;
    }
  }

  /**
   * Get list of paired devices
   */
  static async getPairedDevices(): Promise<PairedDevice[]> {
    try {
      const data = await AsyncStorage.getItem(PAIRED_DEVICES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting paired devices:', error);
      return [];
    }
  }

  /**
   * Connect to a paired device
   */
  static async connectToDevice(deviceId: string): Promise<void> {
    try {
      if (!this.isP2PAvailable()) {
        return;
      }

      if (!this.peer) {
        await this.initialize();
      }

      if (!this.peer || !this.peer.id) {
        return; // Device is paired, but connection will happen later when peer is available
      }

      const conn = this.peer.connect(deviceId, {
        reliable: true,
      });

      if (!conn) {
        return;
      }

      conn.on('open', () => {
        this.connections.set(deviceId, conn);
        this.setupConnectionHandlers(conn);
        
        // Manual sync only - no auto-sync to avoid unnecessary data transfer
        // User can use "Sync Now" button to trigger sync when needed
      });

      conn.on('error', (error) => {
        console.error('Connection error:', error);
        this.connections.delete(deviceId);
      });
    } catch (error) {
      console.error('Error in connectToDevice:', error);
      // Don't throw - device is still paired, just not connected
    }
  }

  /**
   * Handle incoming connection from paired device
   */
  private static async handleIncomingConnection(conn: DataConnection): Promise<void> {
    const pairedDevices = await this.getPairedDevices();
    const isPaired = pairedDevices.some(d => d.id === conn.peer);

    if (!isPaired) {
      conn.close();
      return;
    }

    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.setupConnectionHandlers(conn);
      
      if (this.onPeerOnlineCallback) {
        this.onPeerOnlineCallback(conn.peer);
      }
      
      // Auto-connect back to the peer to establish bi-directional communication
      this.connectToDevice(conn.peer).catch(err => {
        // Bi-directional connection already established or not needed
      });
    });
  }

  /**
   * Setup data handlers for a connection
   */
  private static setupConnectionHandlers(conn: DataConnection): void {
    conn.on('data', async (data: any) => {
      await this.handleReceivedData(data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
    });
  }

  /**
   * Sync with a specific device
   */
  static async syncWithDevice(deviceId: string): Promise<void> {
    console.log('[Sync] Starting sync to device:', deviceId);
    console.log('[Sync] Platform:', Platform.OS);
    
    // Check user's sync method preference
    const settings = await StorageService.getSettings();
    const syncMethod = settings?.syncMethod || 'firebase-relay';
    console.log('[Sync] User preference:', syncMethod);
    
    // Route based on user preference
    if (syncMethod === 'webrtc') {
      // User wants WebRTC - try to use it if available
      if (Platform.OS === 'web') {
        // Web: Try PeerJS WebRTC connection
        if (!this.isP2PAvailable()) {
          console.log('[Sync] WebRTC not available, falling back to Firebase relay');
          return this.syncViaFirebaseRelay(deviceId);
        }

        const conn = this.connections.get(deviceId);
        if (!conn) {
          console.log('[Sync] No WebRTC connection, falling back to Firebase relay');
          return this.syncViaFirebaseRelay(deviceId);
        }

        console.log('[Sync] Using WebRTC connection');
        return this.syncViaWebRTC(deviceId, conn);
      } else {
        // Native: WebRTC requires native build (react-native-webrtc)
        // For now, fall back to Firebase relay in Expo Go
        // In production native build, this would use react-native-webrtc
        console.log('[Sync] WebRTC selected but requires native build. Using Firebase relay in Expo Go.');
        console.log('[Sync] To use WebRTC on native, build with EAS and install react-native-webrtc');
        return this.syncViaFirebaseRelay(deviceId);
      }
    } else if (syncMethod === 'cloud-sync') {
      // Cloud sync - would need Firebase Auth and Firestore
      console.log('[Sync] Cloud sync not yet implemented, using Firebase relay');
      return this.syncViaFirebaseRelay(deviceId);
    } else {
      // Default: firebase-relay
      console.log('[Sync] Using Firebase relay');
      return this.syncViaFirebaseRelay(deviceId);
    }
  }

  /**
   * Sync via WebRTC (P2P direct connection)
   */
  private static async syncViaWebRTC(deviceId: string, conn: DataConnection): Promise<void> {
    console.log('[Sync] Using WebRTC connection');
    
    // Get all local data
    const entries = await StorageService.getEntries();
    const expenses = await StorageService.getExpenses();
    const actionItems = await StorageService.getActionItems();

    console.log('[Sync] Data to send:', {
      entries: entries.length,
      expenses: expenses.length,
      actionItems: actionItems.length
    });

    const syncData: SyncData = {
      entries,
      expenses,
      actionItems,
      timestamp: new Date().toISOString(),
    };

    // Encrypt sync data with shared sync key
    console.log('[Sync] Encrypting data...');
    const encryptedData = encryptData(syncData, this.syncKey!);
    console.log('[Sync] Data encrypted, length:', encryptedData.length);

    // Send to peer via WebRTC
    conn.send({
      type: 'sync',
      data: encryptedData,
    });
    console.log('[Sync] Data sent via WebRTC');

    // Update last sync time
    // Update last sync time
    await this.updateLastSyncTime(deviceId);
  }

  /**
   * Bidirectional sync - both devices exchange data
   */
  static async syncBidirectional(deviceId: string): Promise<void> {
    console.log('[Sync] Starting bidirectional sync with device:', deviceId);
    
    try {
      // Send our data to them (with bidirectional flag)
      await this.syncViaFirebaseRelay(deviceId, true);
      
      console.log('[Sync] ✓ Bidirectional sync completed successfully');
    } catch (error) {
      console.error('[Sync] Bidirectional sync failed:', error);
      throw error;  // Re-throw to show error alert
    }
  }

  /**
   * Handle received sync data
   */
  private static async handleReceivedData(message: any): Promise<void> {
    console.log('[Sync] Received message type:', message.type);
    
    if (message.type !== 'sync') {
      return;
    }

    try {
      console.log('[Sync] Processing sync data...');
      // Decrypt sync data with shared sync key
      const syncData: SyncData = decryptData(message.data, this.syncKey!);
      console.log('[Sync] Data decrypted:', {
        entries: syncData.entries.length,
        expenses: syncData.expenses.length,
        actionItems: syncData.actionItems.length
      });

      // Merge with local data (conflict resolution: newer wins)
      await this.mergeData(syncData);
      console.log('[Sync] Data merged successfully');

      if (this.onSyncCallback) {
        this.onSyncCallback(syncData);
      }
      
      // Trigger UI refresh
      if (this.onDataRefreshCallback) {
        this.onDataRefreshCallback();
      }
    } catch (error) {
      console.error('[Sync] Failed to handle sync data:', error);
    }
  }

  /**
   * Merge received data with local data
   */
  private static async mergeData(syncData: SyncData): Promise<void> {
    // Get local data
    const localEntries = await StorageService.getEntries();
    const localExpenses = await StorageService.getExpenses();
    const localActionItems = await StorageService.getActionItems();

    // Merge entries
    const mergedEntries = this.mergeArrays(localEntries, syncData.entries);
    await StorageService.saveEntries(mergedEntries);

    // Merge expenses
    const mergedExpenses = this.mergeArrays(localExpenses, syncData.expenses);
    await StorageService.saveExpenses(mergedExpenses);

    // Merge action items
    const mergedActionItems = this.mergeArrays(localActionItems, syncData.actionItems);
    await StorageService.saveActionItems(mergedActionItems);
  }

  /**
   * Merge two arrays by ID, keeping newer items
   */
  private static mergeArrays<T extends { id: string; timestamp?: any }>(
    local: T[],
    remote: T[]
  ): T[] {
    const map = new Map<string, T>();

    // Add local items first
    local.forEach(item => {
      map.set(item.id, item);
    });

    // Add/update with remote items (newer wins based on timestamp)
    remote.forEach(item => {
      const existing = map.get(item.id);
      
      if (!existing) {
        // New item, add it
        map.set(item.id, item);
      } else if (item.timestamp && existing.timestamp) {
        // Both have timestamps, compare them
        const itemTime = typeof item.timestamp === 'string' 
          ? new Date(item.timestamp).getTime() 
          : new Date(item.timestamp).getTime();
        const existingTime = typeof existing.timestamp === 'string'
          ? new Date(existing.timestamp).getTime()
          : new Date(existing.timestamp).getTime();
        
        // Keep the newer one
        if (itemTime > existingTime) {
          map.set(item.id, item);
        }
      } else if (item.timestamp && !existing.timestamp) {
        // Remote has timestamp but local doesn't, prefer remote
        map.set(item.id, item);
      }
      // If remote doesn't have timestamp or timestamps are equal, keep local (already in map)
    });

    const result = Array.from(map.values());
    console.log(`[Merge] Deduplication: ${local.length} local + ${remote.length} remote = ${result.length} merged`);
    return result;
  }

  /**
   * Check if a device is currently connected
   */
  static isDeviceConnected(deviceId: string): boolean {
    return this.connections.has(deviceId);
  }

  /**
   * Get connection status for a device
   */
  static getConnectionStatus(deviceId: string): 'connected' | 'disconnected' | 'unavailable' {
    if (!this.isP2PAvailable()) {
      return 'unavailable';
    }
    return this.connections.has(deviceId) ? 'connected' : 'disconnected';
  }

  /**
   * Get user-friendly status message
   */
  static getStatusMessage(deviceId: string): string {
    const status = this.getConnectionStatus(deviceId);
    switch (status) {
      case 'connected':
        return '🟢 Connected (WebRTC)';
      case 'disconnected':
        return '🟡 Ready (Firebase Relay)';
      case 'unavailable':
        return '🟡 Ready (Firebase Relay)';
      default:
        return '❓ Unknown';
    }
  }

  /**
   * Auto-connect to all paired devices
   */
  static async autoConnectPairedDevices(): Promise<void> {
    const pairedDevices = await this.getPairedDevices();
    
    for (const device of pairedDevices) {
      try {
        await this.connectToDevice(device.id);
      } catch (error) {
        console.log('Could not connect to:', device.name);
      }
    }
  }

  /**
   * Set callback for sync events
   */
  static onSync(callback: (data: SyncData) => void): void {
    this.onSyncCallback = callback;
  }

  /**
   * Set callback for peer online events
   */
  static onPeerOnline(callback: (deviceId: string) => void): void {
    this.onPeerOnlineCallback = callback;
  }
  
  /**
   * Set callback for data refresh (called after sync data is merged)
   */
  static onDataRefresh(callback: () => void): void {
    this.onDataRefreshCallback = callback;
  }

  /**
   * Disconnect from all devices
   */
  static disconnect(): void {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
  
  /**
   * Initialize Firebase Realtime Database listener for relay sync
   * Web platforms listen for data uploaded by native apps
   */
  private static initializeFirebaseRelay(): void {
    if (!this.deviceId) {
      console.log('[Firebase Relay] Cannot initialize - no device ID');
      return;
    }
    
    console.log('[Firebase Relay] Initializing listener for device:', this.deviceId, 'on platform:', Platform.OS);
    
    // Listen for sync data sent to this device
    const syncRef = ref(realtimeDb, `sync/${this.deviceId}`);
    
    onValue(syncRef, async (snapshot) => {
      console.log('[Firebase Relay] Snapshot received');
      const data = snapshot.val();
      console.log('[Firebase Relay] Data exists:', !!data);
      
      if (!data) {
        return;
      }
      
      // Handle pairing confirmation messages
      if (data.type === 'pairing_confirmation') {
        console.log('[Firebase Relay] Received pairing confirmation from:', data.fromDevice);
        
        try {
          // Store their sync key
          await AsyncStorage.setItem(`@sync_key_${data.fromDevice}`, data.syncKey);
          console.log('[Firebase Relay] Stored sync key for:', data.fromDevice);
          
          // Add to paired devices if not already there
          const pairedDevices = await this.getPairedDevices();
          if (!pairedDevices.some(d => d.id === data.fromDevice)) {
            const pairedDevice: PairedDevice = {
              id: data.fromDevice,
              name: data.deviceName || 'Unknown Device',
              pairedAt: new Date().toISOString(),
            };
            pairedDevices.push(pairedDevice);
            await AsyncStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(pairedDevices));
            console.log('[Firebase Relay] Added device to paired list:', data.deviceName);
          }
          
          // Clear the pairing confirmation from Firebase
          await set(syncRef, null);
        } catch (error) {
          console.error('[Firebase Relay] Error processing pairing confirmation:', error);
        }
        
        return;
      }
      
      // Handle regular sync data
      if (data.data && data.timestamp) {
        console.log('[Firebase Relay] Valid sync data from:', data.fromDevice);
        
        try {
          // Decrypt sync data with shared sync key
          const syncKey = await AsyncStorage.getItem(`@sync_key_${data.fromDevice}`);
          if (!syncKey) {
            console.error('[Firebase Relay] No sync key found for device:', data.fromDevice);
            return;
          }
          
          console.log('[Firebase Relay] Decrypting data...');
          const syncData: SyncData = decryptData(data.data, syncKey);
          console.log('[Firebase Relay] Data decrypted:', {
            entries: syncData.entries.length,
            expenses: syncData.expenses.length,
            actionItems: syncData.actionItems.length
          });
          
          // Merge with local data
          await this.mergeData(syncData);
          console.log('[Firebase Relay] Data merged');
          
          // If this was a bidirectional sync request, send our data back
          if (data.bidirectional && !data.isResponse) {
            console.log('[Firebase Relay] Bidirectional sync requested, sending data back to:', data.fromDevice);
            try {
              // Send our data back (mark as response to avoid infinite loop)
              await this.sendSyncResponse(data.fromDevice);
            } catch (error) {
              console.error('[Firebase Relay] Error sending sync response:', error);
            }
          }
          
          // Notify callback
          if (this.onSyncCallback) {
            this.onSyncCallback(syncData);
          }
          
          // Trigger UI refresh
          if (this.onDataRefreshCallback) {
            this.onDataRefreshCallback();
          }
          
          // Clean up the relay data after receiving
          await remove(syncRef);
          console.log('[Firebase Relay] ✓ Sync complete');
        } catch (error) {
          console.error('[Firebase Relay] Error processing data:', error);
        }
      }
    });
  }
  
  /**
   * Send sync data via Firebase relay (for native apps to web)
   */
  static async syncViaFirebaseRelay(targetDeviceId: string, bidirectional: boolean = false): Promise<void> {
    try {
      console.log('[Firebase Relay] Starting sync to:', targetDeviceId);
      
      // Get all local data
      const entries = await StorageService.getEntries();
      const expenses = await StorageService.getExpenses();
      const actionItems = await StorageService.getActionItems();

      console.log('[Firebase Relay] Data to sync:', {
        entries: entries.length,
        expenses: expenses.length,
        actionItems: actionItems.length
      });
      console.log('[Firebase Relay] Sample data check:', {
        firstEntry: entries[0]?.text?.substring(0, 30),
        firstExpense: expenses[0]?.amount,
        firstTask: actionItems[0]?.title?.substring(0, 30)
      });

      // Prepare sync data (dates will be serialized by JSON.stringify)
      const syncData: SyncData = {
        entries,
        expenses,
        actionItems,
        timestamp: new Date().toISOString(),
      };

      // Get the sync key for this device
      const syncKey = await AsyncStorage.getItem(`@sync_key_${targetDeviceId}`);
      if (!syncKey) {
        throw new Error('No sync key found for target device');
      }

      console.log('[Firebase Relay] Encrypting data...');
      // Encrypt sync data with shared sync key
      const encryptedData = encryptData(syncData, syncKey);
      console.log('[Firebase Relay] Data encrypted, length:', encryptedData.length);
      
      // Upload to Firebase Realtime Database
      try {
        console.log('[Firebase Relay] Uploading to Firebase...');
        const syncRef = ref(realtimeDb, `sync/${targetDeviceId}`);
        const uploadData = {
          data: encryptedData,
          timestamp: Date.now(),
          fromDevice: this.deviceId,
          bidirectional: bidirectional  // Flag to request sync back
        };
        
        await set(syncRef, uploadData);
        console.log('[Firebase Relay] ✓ Upload successful!');
      } catch (uploadError: any) {
        console.error('[Firebase Relay] Upload error:', uploadError);
        // Check if it's a 404 error (database doesn't exist)
        if (uploadError.message?.includes('404') || uploadError.message?.includes('not found')) {
          throw new Error('Firebase Realtime Database not enabled. Please enable it in Firebase Console: https://console.firebase.google.com/ → Build → Realtime Database → Create Database');
        }
        
        // Check for permission errors
        if (uploadError.code === 'PERMISSION_DENIED' || uploadError.message?.includes('permission')) {
          throw new Error('Firebase permission denied. Please check your database rules in Firebase Console.');
        }
        
        throw new Error(`Firebase upload failed: ${uploadError.message || uploadError.code || 'Unknown error'}`);
      }
      
      // Update last sync time
      await this.updateLastSyncTime(targetDeviceId);
    } catch (error) {
      console.error('[Firebase Relay] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Send sync response (for bidirectional sync)
   */
  private static async sendSyncResponse(targetDeviceId: string): Promise<void> {
    try {
      // Get all local data
      const entries = await StorageService.getEntries();
      const expenses = await StorageService.getExpenses();
      const actionItems = await StorageService.getActionItems();

      const syncData: SyncData = {
        entries,
        expenses,
        actionItems,
        timestamp: new Date().toISOString(),
      };

      // Get the sync key for this device
      const syncKey = await AsyncStorage.getItem(`@sync_key_${targetDeviceId}`);
      if (!syncKey) {
        throw new Error('No sync key found for target device');
      }

      // Encrypt sync data
      const encryptedData = encryptData(syncData, syncKey);
      
      // Upload response to Firebase
      const syncRef = ref(realtimeDb, `sync/${targetDeviceId}`);
      const uploadData = {
        data: encryptedData,
        timestamp: Date.now(),
        fromDevice: this.deviceId,
        isResponse: true  // Mark as response to prevent infinite loop
      };
      
      await set(syncRef, uploadData);
      console.log('[Firebase Relay] ✓ Sync response sent');
    } catch (error) {
      console.error('[Firebase Relay] Error sending sync response:', error);
      throw error;
    }
  }

  // Helper methods
  private static generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substring(2, 15);
  }

  private static generateSyncKey(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private static async getDeviceName(): Promise<string> {
    // You can customize this based on platform
    return `Device ${this.deviceId?.substring(0, 8)}`;
  }

  private static async updateLastSyncTime(deviceId: string): Promise<void> {
    const devices = await this.getPairedDevices();
    const updated = devices.map(d => 
      d.id === deviceId ? { ...d, lastSyncAt: new Date().toISOString() } : d
    );
    await AsyncStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(updated));
  }
}
