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
    
    // Initialize Firebase relay listener (for receiving data from native apps)
    if (Platform.OS === 'web') {
      this.initializeFirebaseRelay();
    }

    return deviceId;
  }

  /**
   * Connect to PeerJS signaling server
   */
  private static async connectToPeerNetwork(): Promise<void> {
    // Skip PeerJS on native mobile - not supported
    if (Platform.OS !== 'web') {
      console.log('P2P sync only available on web platform');
      return;
    }

    if (this.peer) {
      this.peer.destroy();
    }

    try {
      // Use free PeerJS cloud server
      this.peer = new Peer(this.deviceId!, {
        debug: 2, // Enable logging
      });

      this.peer.on('open', (id) => {
        console.log('Connected to peer network with ID:', id);
      });

      this.peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
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

      // Store their sync key (encrypted with our key)
      await AsyncStorage.setItem(`@sync_key_${deviceId}`, syncKey);

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
        console.log('P2P not available on this platform');
        return;
      }

      if (!this.peer) {
        console.log('Peer not initialized, attempting to initialize...');
        await this.initialize();
      }

      if (!this.peer || !this.peer.id) {
        console.log('WebRTC not available - device paired but connection deferred');
        return; // Device is paired, but connection will happen later when peer is available
      }

      const conn = this.peer.connect(deviceId, {
        reliable: true,
      });

      if (!conn) {
        console.log('Failed to create connection - WebRTC may not be available');
        return;
      }

      conn.on('open', () => {
        console.log('Connected to device:', deviceId);
        this.connections.set(deviceId, conn);
        this.setupConnectionHandlers(conn);
        
        // Trigger auto-sync
        this.syncWithDevice(deviceId);
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
      console.log('Rejecting connection from unpaired device:', conn.peer);
      conn.close();
      return;
    }

    conn.on('open', () => {
      console.log('Accepted incoming connection from:', conn.peer);
      this.connections.set(conn.peer, conn);
      this.setupConnectionHandlers(conn);
      
      if (this.onPeerOnlineCallback) {
        this.onPeerOnlineCallback(conn.peer);
      }
      
      // Auto-connect back to the peer to establish bi-directional communication
      console.log('Establishing bi-directional connection...');
      this.connectToDevice(conn.peer).catch(err => {
        console.log('Bi-directional connection already established or not needed:', err);
      });
    });
  }

  /**
   * Setup data handlers for a connection
   */
  private static setupConnectionHandlers(conn: DataConnection): void {
    conn.on('data', async (data: any) => {
      console.log('Received data from:', conn.peer);
      await this.handleReceivedData(data);
    });

    conn.on('close', () => {
      console.log('Connection closed:', conn.peer);
      this.connections.delete(conn.peer);
    });
  }

  /**
   * Sync with a specific device
   */
  static async syncWithDevice(deviceId: string): Promise<void> {
    // For native platforms, use Firebase relay instead of WebRTC
    if (Platform.OS !== 'web') {
      console.log('Using Firebase relay sync (native platform)');
      return this.syncViaFirebaseRelay(deviceId);
    }
    
    // For web platforms, try WebRTC first, fallback to Firebase relay
    if (!this.isP2PAvailable()) {
      console.log('WebRTC not available, using Firebase relay');
      return this.syncViaFirebaseRelay(deviceId);
    }

    const conn = this.connections.get(deviceId);
    if (!conn) {
      console.log('No WebRTC connection, using Firebase relay as fallback');
      return this.syncViaFirebaseRelay(deviceId);
    }

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

    // TEMPORARY: Skip encryption for debugging
    const syncDataString = JSON.stringify(syncData);

    // Send to peer via WebRTC
    conn.send({
      type: 'sync',
      data: syncDataString, // Unencrypted for now
    });

    // Update last sync time
    await this.updateLastSyncTime(deviceId);

    console.log('WebRTC sync sent to device:', deviceId);
  }

  /**
   * Handle received sync data
   */
  private static async handleReceivedData(message: any): Promise<void> {
    if (message.type !== 'sync') {
      return;
    }

    try {
      // TEMPORARY: Skip decryption for debugging
      const syncData: SyncData = JSON.parse(message.data);

      // Merge with local data (conflict resolution: newer wins)
      await this.mergeData(syncData);

      if (this.onSyncCallback) {
        this.onSyncCallback(syncData);
      }
      
      // Trigger UI refresh
      if (this.onDataRefreshCallback) {
        this.onDataRefreshCallback();
      }

      console.log('Sync data merged successfully');
    } catch (error) {
      console.error('Failed to handle sync data:', error);
    }
  }

  /**
   * Merge received data with local data
   */
  private static async mergeData(syncData: SyncData): Promise<void> {
    console.log('[Merge] Starting data merge...');
    
    // Get local data
    const localEntries = await StorageService.getEntries();
    const localExpenses = await StorageService.getExpenses();
    const localActionItems = await StorageService.getActionItems();

    console.log('[Merge] Local data:', {
      entries: localEntries.length,
      expenses: localExpenses.length,
      actionItems: localActionItems.length
    });
    
    console.log('[Merge] Remote data:', {
      entries: syncData.entries.length,
      expenses: syncData.expenses.length,
      actionItems: syncData.actionItems.length
    });

    // Merge entries
    const mergedEntries = this.mergeArrays(localEntries, syncData.entries);
    console.log('[Merge] Merged entries:', mergedEntries.length);
    await StorageService.saveEntries(mergedEntries);

    // Merge expenses
    const mergedExpenses = this.mergeArrays(localExpenses, syncData.expenses);
    console.log('[Merge] Merged expenses:', mergedExpenses.length);
    await StorageService.saveExpenses(mergedExpenses);

    // Merge action items
    const mergedActionItems = this.mergeArrays(localActionItems, syncData.actionItems);
    console.log('[Merge] Merged action items:', mergedActionItems.length);
    await StorageService.saveActionItems(mergedActionItems);
    
    console.log('[Merge] Data merge complete!');
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
        return '🟢 Connected';
      case 'disconnected':
        return '🔴 Offline';
      case 'unavailable':
        return '⚠️ Use Export/Import';
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
    
    if (Platform.OS !== 'web') {
      console.log('[Firebase Relay] Skipping listener - not web platform');
      return;
    }
    
    console.log('[Firebase Relay] ✅ Initializing listener for device:', this.deviceId);
    console.log('[Firebase Relay] Listening at path: sync/' + this.deviceId);
    
    // Listen for sync data sent to this device
    const syncRef = ref(realtimeDb, `sync/${this.deviceId}`);
    
    onValue(syncRef, async (snapshot) => {
      console.log('[Firebase Relay] 🔔 Snapshot received!');
      const data = snapshot.val();
      console.log('[Firebase Relay] Data exists:', !!data);
      console.log('[Firebase Relay] Data value:', data);
      
      if (data && data.data && data.timestamp) {
        console.log('[Firebase Relay] ✅ Valid sync data received from device:', data.fromDevice);
        
        try {
          // TEMPORARY: Skip decryption for debugging
          console.log('[Firebase Relay] Parsing data (no decryption in debug mode)...');
          const syncData: SyncData = JSON.parse(data.data);
          
          console.log('[Firebase Relay] Parsed data:', {
            entries: syncData.entries.length,
            expenses: syncData.expenses.length,
            actionItems: syncData.actionItems.length
          });
          
          // Merge with local data
          await this.mergeData(syncData);
          
          console.log('[Firebase Relay] Data merged successfully');
          
          // Notify callback
          if (this.onSyncCallback) {
            this.onSyncCallback(syncData);
          }
          
          // Trigger UI refresh
          if (this.onDataRefreshCallback) {
            this.onDataRefreshCallback();
          }
          
          console.log('[Firebase Relay] Sync completed, cleaning up...');
          
          // Clean up the relay data after receiving
          await remove(syncRef);
        } catch (error) {
          console.error('[Firebase Relay] Error processing data:', error);
        }
      }
    });
  }
  
  /**
   * Send sync data via Firebase relay (for native apps to web)
   */
  static async syncViaFirebaseRelay(targetDeviceId: string): Promise<void> {
    try {
      console.log('[Firebase Relay] ===== MOBILE SYNC START =====');
      console.log('[Firebase Relay] Starting sync to:', targetDeviceId);
      console.log('[Firebase Relay] My device ID:', this.deviceId);
      
      // Get all local data
      const entries = await StorageService.getEntries();
      const expenses = await StorageService.getExpenses();
      const actionItems = await StorageService.getActionItems();
      
      console.log('[Firebase Relay] Data to sync:', {
        entries: entries.length,
        expenses: expenses.length,
        actionItems: actionItems.length
      });

      // Prepare sync data (dates will be serialized by JSON.stringify)
      const syncData: SyncData = {
        entries,
        expenses,
        actionItems,
        timestamp: new Date().toISOString(),
      };

      console.log('[Firebase Relay] Data serialized successfully');

      // Get the sync key for this device
      const syncKey = await AsyncStorage.getItem(`@sync_key_${targetDeviceId}`);
      if (!syncKey) {
        throw new Error('No sync key found for target device');
      }

      // TEMPORARY: Skip encryption for debugging
      console.log('[Firebase Relay] Skipping encryption (debug mode)');
      const syncDataString = JSON.stringify(syncData);
      console.log('[Firebase Relay] Data stringified, length:', syncDataString.length);
      
      // Upload to Firebase Realtime Database
      console.log('[Firebase Relay] Uploading to Firebase...');
      console.log('[Firebase Relay] Target path: sync/' + targetDeviceId);
      try {
        const syncRef = ref(realtimeDb, `sync/${targetDeviceId}`);
        const uploadData = {
          data: syncDataString, // Unencrypted for now
          timestamp: Date.now(),
          fromDevice: this.deviceId
        };
        console.log('[Firebase Relay] Upload payload:', { ...uploadData, data: '...(truncated)...' });
        
        await set(syncRef, uploadData);
        console.log('[Firebase Relay] ✅ Upload successful!');
        console.log('[Firebase Relay] Data is now at: sync/' + targetDeviceId);
        console.log('[Firebase Relay] Desktop should receive it shortly...');
      } catch (uploadError: any) {
        console.error('[Firebase Relay] ===== UPLOAD ERROR =====');
        console.error('[Firebase Relay] Error message:', uploadError.message);
        console.error('[Firebase Relay] Error code:', uploadError.code);
        console.error('[Firebase Relay] Error name:', uploadError.name);
        console.error('[Firebase Relay] Full error:', JSON.stringify(uploadError, null, 2));
        console.error('[Firebase Relay] ============================');
        
        // Check if it's a 404 error (database doesn't exist)
        if (uploadError.message?.includes('404') || uploadError.message?.includes('not found')) {
          throw new Error('Firebase Realtime Database not enabled. Please enable it in Firebase Console: https://console.firebase.google.com/ → Build → Realtime Database → Create Database');
        }
        
        // Check for permission errors
        if (uploadError.code === 'PERMISSION_DENIED' || uploadError.message?.includes('permission')) {
          throw new Error('Firebase permission denied. Please check your database rules in Firebase Console.');
        }
        
        throw new Error(`Firebase upload failed: ${uploadError.message || uploadError.code || 'Unknown error'}. Check console for details.`);
      }
      
      // Update last sync time
      await this.updateLastSyncTime(targetDeviceId);

      console.log('[Firebase Relay] ===== MOBILE SYNC COMPLETE =====');
      console.log('[Firebase Relay] Sync completed successfully!');
      console.log('[Firebase Relay] Note: Data will be deleted from Firebase after desktop receives it');
    } catch (error) {
      console.error('[Firebase Relay] ===== MOBILE SYNC FAILED =====');
      console.error('[Firebase Relay] Sync failed:', error);
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
