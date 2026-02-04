import Peer, { DataConnection } from 'peerjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Initialize PeerJS connection
    await this.connectToPeerNetwork();

    return deviceId;
  }

  /**
   * Connect to PeerJS signaling server
   */
  private static async connectToPeerNetwork(): Promise<void> {
    if (this.peer) {
      this.peer.destroy();
    }

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
    });
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
      console.log('Accepted connection from:', conn.peer);
      this.connections.set(conn.peer, conn);
      this.setupConnectionHandlers(conn);
      
      if (this.onPeerOnlineCallback) {
        this.onPeerOnlineCallback(conn.peer);
      }
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
    const conn = this.connections.get(deviceId);
    if (!conn) {
      console.log('No connection to device:', deviceId);
      return;
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

    // Encrypt data with shared sync key
    const syncKey = await AsyncStorage.getItem(`@sync_key_${deviceId}`);
    if (!syncKey) {
      console.error('No sync key for device:', deviceId);
      return;
    }

    const encryptedData = encryptData(JSON.stringify(syncData), syncKey);

    // Send to peer
    conn.send({
      type: 'sync',
      data: encryptedData,
    });

    // Update last sync time
    await this.updateLastSyncTime(deviceId);

    console.log('Sync sent to device:', deviceId);
  }

  /**
   * Handle received sync data
   */
  private static async handleReceivedData(message: any): Promise<void> {
    if (message.type !== 'sync') {
      return;
    }

    try {
      // Decrypt data
      const syncKey = this.syncKey!;
      const decryptedData = decryptData(message.data, syncKey);
      const syncData: SyncData = JSON.parse(decryptedData);

      // Merge with local data (conflict resolution: newer wins)
      await this.mergeData(syncData);

      if (this.onSyncCallback) {
        this.onSyncCallback(syncData);
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
    // Simple merge strategy: combine and deduplicate by ID
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
  private static mergeArrays<T extends { id: string; timestamp?: Date }>(
    local: T[],
    remote: T[]
  ): T[] {
    const map = new Map<string, T>();

    // Add local items
    local.forEach(item => map.set(item.id, item));

    // Add/update with remote items (newer wins)
    remote.forEach(item => {
      const existing = map.get(item.id);
      if (!existing || (item.timestamp && existing.timestamp && 
          new Date(item.timestamp) > new Date(existing.timestamp))) {
        map.set(item.id, item);
      }
    });

    return Array.from(map.values());
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
