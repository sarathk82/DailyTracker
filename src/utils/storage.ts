import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, ActionItem, Expense, SettingsData } from '../types';
import { encryptData, decryptData, generateSalt } from './encryption';

const ENTRIES_KEY = '@daily_tracker_entries';
const ACTION_ITEMS_KEY = '@daily_tracker_action_items';
const EXPENSES_KEY = '@daily_tracker_expenses';
const SETTINGS_KEY = '@daily_tracker_settings';
const BACKUP_KEY = '@daily_tracker_backup';
const ENCRYPTION_KEY_STORAGE = '@daily_tracker_encryption_key';
const ENCRYPTION_ENABLED_KEY = '@daily_tracker_encryption_enabled';

// Generate a device-specific encryption key
const generateDeviceKey = (): string => {
  // Use timestamp and random values for key generation
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2);
  const random2 = Math.random().toString(36).substring(2);
  const random3 = Math.random().toString(36).substring(2);
  const combined = timestamp + random1 + random2 + random3;
  
  // Pad to 64 hex characters (32 bytes)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(combined);
  const hash = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    hash[i % 32] ^= bytes[i];
  }
  
  return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
};

let cachedEncryptionKey: string | null = null;
let encryptionEnabled: boolean = true; // Default to enabled

// Get or create the local encryption key
const getLocalEncryptionKey = async (): Promise<string> => {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }
  
  try {
    let key = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
    if (!key) {
      // Generate new key on first use
      key = generateDeviceKey();
      await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE, key);
      // Enable encryption by default
      await AsyncStorage.setItem(ENCRYPTION_ENABLED_KEY, 'true');
    }
    cachedEncryptionKey = key;
    return key;
  } catch (error) {
    console.error('Error getting encryption key:', error);
    // Fallback to a generated key (won't persist, but prevents crashes)
    return generateDeviceKey();
  }
};

// Check if encryption is enabled
const isEncryptionEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(ENCRYPTION_ENABLED_KEY);
    encryptionEnabled = enabled === 'true';
    return encryptionEnabled;
  } catch (error) {
    console.error('Error checking encryption status:', error);
    return false;
  }
};

// Encrypt data before storing
const encryptIfEnabled = async (data: any): Promise<string> => {
  const enabled = await isEncryptionEnabled();
  if (!enabled) {
    return JSON.stringify(data);
  }
  
  try {
    const key = await getLocalEncryptionKey();
    return encryptData(data, key);
  } catch (error) {
    console.error('Encryption failed, storing unencrypted:', error);
    return JSON.stringify(data);
  }
};

// Decrypt data after retrieving
const decryptIfNeeded = async (dataString: string): Promise<any> => {
  if (!dataString) return null;
  
  const trimmed = dataString.trim();

  // Old CryptoJS "Salted__" base64 format — cannot be decrypted with current AES-CTR system
  if (trimmed.startsWith('U2FsdGVkX1')) {
    return null;
  }

  // Try to parse as JSON (unencrypted / plain format)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return null;
    }
  }

  // Current encrypted format: IV + ciphertext as hex string
  const isValidHex = /^[0-9a-fA-F]+$/.test(trimmed);
  if (isValidHex && trimmed.length > 32) {
    try {
      const key = await getLocalEncryptionKey();
      return decryptData(trimmed, key);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Unknown/unrecoverable format
  return null;
};

export class StorageService {
  // Entries
  // Deduplicate by ID (keep first occurrence)
  static async deduplicateEntries(): Promise<void> {
    const entries = await this.getEntries();
    const seen = new Set<string>();
    const unique = entries.filter(entry => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    });
    
    if (unique.length < entries.length) {
      console.log(`[Dedupe] Removed ${entries.length - unique.length} duplicate entries`);
      await this.saveEntries(unique);
    }
  }

  static async deduplicateExpenses(): Promise<void> {
    const expenses = await this.getExpenses();
    const seen = new Set<string>();
    const unique = expenses.filter(exp => {
      if (seen.has(exp.id)) {
        return false;
      }
      seen.add(exp.id);
      return true;
    });
    
    if (unique.length < expenses.length) {
      console.log(`[Dedupe] Removed ${expenses.length - unique.length} duplicate expenses`);
      await this.saveExpenses(unique);
    }
  }

  static async deduplicateActionItems(): Promise<void> {
    const items = await this.getActionItems();
    const seen = new Set<string>();
    const unique = items.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
    
    if (unique.length < items.length) {
      console.log(`[Dedupe] Removed ${items.length - unique.length} duplicate action items`);
      await this.saveActionItems(unique);
    }
  }

  static async deduplicateAll(): Promise<void> {
    console.log('[Dedupe] Starting deduplication...');
    await this.deduplicateEntries();
    await this.deduplicateExpenses();
    await this.deduplicateActionItems();
    console.log('[Dedupe] Deduplication complete!');
  }

  // Existing methods
  static async getEntries(): Promise<Entry[]> {
    try {
      const encryptedValue = await AsyncStorage.getItem(ENTRIES_KEY);
      if (encryptedValue != null) {
        const entries = await decryptIfNeeded(encryptedValue);
        if (!entries || !Array.isArray(entries)) {
          console.warn('Invalid entries data, returning empty array');
          return [];
        }
        // Convert timestamp strings back to Date objects and ensure type preservation
        const restoredEntries = entries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
          // Ensure type is preserved as literal type
          type: entry.type as 'log' | 'action' | 'expense' | 'system',
          // Preserve markdown flag if it exists
          isMarkdown: entry.isMarkdown || false
        }));
        
        // Sort entries to maintain conversation flow
        const sortedEntries = restoredEntries.sort((a: Entry, b: Entry) => {
          // If timestamps are within 2 seconds of each other, maintain user-system alternation
          const timeDiff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
          if (timeDiff < 2000) {
            // If one is a system message and the other isn't, maintain the conversation flow
            if (a.type === 'system' && b.type !== 'system') return 1;
            if (a.type !== 'system' && b.type === 'system') return -1;
          }
          return a.timestamp.getTime() - b.timestamp.getTime();
        });
        return sortedEntries;
      }
      return [];
    } catch (e) {
      console.error('Error getting entries:', e);
      return [];
    }
  }

  static async saveEntries(entries: Entry[]): Promise<void> {
    try {
      const encryptedValue = await encryptIfEnabled(entries);
      await AsyncStorage.setItem(ENTRIES_KEY, encryptedValue);
    } catch (e) {
      console.error('Error saving entries:', e);
    }
  }

  static async addEntry(entry: Entry): Promise<void> {
    try {
      const entries = await this.getEntries();
      entries.push(entry);
      await this.saveEntries(entries);
    } catch (e) {
      console.error('Error adding entry:', e);
    }
  }

  // Action Items
  static async getActionItems(): Promise<ActionItem[]> {
    try {
      const encryptedValue = await AsyncStorage.getItem(ACTION_ITEMS_KEY);
      if (encryptedValue != null) {
        const actionItems = await decryptIfNeeded(encryptedValue);
        if (!actionItems || !Array.isArray(actionItems)) {
          console.warn('Invalid action items data, returning empty array');
          return [];
        }
        return actionItems.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        }));
      }
      return [];
    } catch (e) {
      console.error('Error getting action items:', e);
      return [];
    }
  }

  static async saveActionItems(actionItems: ActionItem[]): Promise<void> {
    try {
      const encryptedValue = await encryptIfEnabled(actionItems);
      await AsyncStorage.setItem(ACTION_ITEMS_KEY, encryptedValue);
    } catch (e) {
      console.error('Error saving action items:', e);
    }
  }

  static async addActionItem(actionItem: ActionItem): Promise<void> {
    try {
      const actionItems = await this.getActionItems();
      actionItems.push(actionItem);
      await this.saveActionItems(actionItems);
    } catch (e) {
      console.error('Error adding action item:', e);
    }
  }

  static async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<void> {
    try {
      const actionItems = await this.getActionItems();
      const index = actionItems.findIndex(item => item.id === id);
      if (index !== -1) {
        actionItems[index] = { ...actionItems[index], ...updates };
      }
      await this.saveActionItems(actionItems);
    } catch (e) {
      console.error('Error updating action item:', e);
    }
  }

  static async deleteActionItem(id: string): Promise<void> {
    try {
      const actionItems = await this.getActionItems();
      const filteredItems = actionItems.filter(item => item.id !== id);
      await this.saveActionItems(filteredItems);
    } catch (e) {
      console.error('Error deleting action item:', e);
    }
  }

  // Expenses
  static async getExpenses(): Promise<Expense[]> {
    try {
      const encryptedValue = await AsyncStorage.getItem(EXPENSES_KEY);
      if (encryptedValue != null) {
        const expenses = await decryptIfNeeded(encryptedValue);
        if (!expenses || !Array.isArray(expenses)) {
          console.warn('Invalid expenses data, returning empty array');
          return [];
        }
        const mappedExpenses = expenses.map((expense: any) => ({
          ...expense,
          createdAt: new Date(expense.createdAt),
        }));
        return mappedExpenses;
      }
      return [];
    } catch (e) {
      console.error('Error getting expenses:', e);
      return [];
    }
  }

  static async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      const encryptedValue = await encryptIfEnabled(expenses);
      await AsyncStorage.setItem(EXPENSES_KEY, encryptedValue);
    } catch (e) {
      console.error('Error saving expenses:', e);
    }
  }

  static async addExpense(expense: Expense): Promise<void> {
    try {
      const expenses = await this.getExpenses();
      expenses.push(expense);
      await this.saveExpenses(expenses);
    } catch (e) {
      console.error('Error adding expense:', e);
    }
  }

  static async updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
    try {
      const expenses = await this.getExpenses();
      const index = expenses.findIndex(expense => expense.id === id);
      if (index !== -1) {
        expenses[index] = { ...expenses[index], ...updates };
        await this.saveExpenses(expenses);
      }
    } catch (e) {
      console.error('Error updating expense:', e);
    }
  }

  static async deleteExpense(id: string): Promise<void> {
    try {
      const expenses = await this.getExpenses();
      const filteredExpenses = expenses.filter(expense => expense.id !== id);
      await this.saveExpenses(filteredExpenses);
    } catch (e) {
      console.error('Error deleting expense:', e);
    }
  }

  // Settings
  static async getSettings(): Promise<SettingsData | null> {
    try {
      const encryptedValue = await AsyncStorage.getItem(SETTINGS_KEY);
      return encryptedValue != null ? await decryptIfNeeded(encryptedValue) : null;
    } catch (e) {
      console.error('Error getting settings:', e);
      return null;
    }
  }

  static async saveSettings(settings: SettingsData): Promise<void> {
    try {
      const encryptedValue = await encryptIfEnabled(settings);
      await AsyncStorage.setItem(SETTINGS_KEY, encryptedValue);
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  // Backup & Restore
  static async saveBackup(backup: any): Promise<void> {
    try {
      const encryptedValue = await encryptIfEnabled(backup);
      await AsyncStorage.setItem(BACKUP_KEY, encryptedValue);
    } catch (e) {
      console.error('Error saving backup:', e);
    }
  }

  static async getBackup(): Promise<any> {
    try {
      const encryptedValue = await AsyncStorage.getItem(BACKUP_KEY);
      if (encryptedValue != null) {
        const backup = await decryptIfNeeded(encryptedValue);
        // Restore date objects
        return {
          ...backup,
          entries: backup.entries.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp)
          })),
          expenses: backup.expenses.map((e: any) => ({
            ...e,
            createdAt: new Date(e.createdAt)
          })),
          actionItems: backup.actionItems.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            dueDate: a.dueDate ? new Date(a.dueDate) : undefined
          }))
        };
      }
      return null;
    } catch (e) {
      console.error('Error getting backup:', e);
      return null;
    }
  }

  // Encryption management
  static async isEncryptionEnabled(): Promise<boolean> {
    return await isEncryptionEnabled();
  }

  static async setEncryptionEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(ENCRYPTION_ENABLED_KEY, enabled ? 'true' : 'false');
      encryptionEnabled = enabled;
    } catch (error) {
      console.error('Error setting encryption status:', error);
    }
  }

  static async reEncryptAllData(): Promise<void> {
    try {
      // Get all data
      const entries = await this.getEntries();
      const actionItems = await this.getActionItems();
      const expenses = await this.getExpenses();
      const settings = await this.getSettings();
      const backup = await this.getBackup();

      // Re-save all data (will use current encryption settings)
      await this.saveEntries(entries);
      await this.saveActionItems(actionItems);
      await this.saveExpenses(expenses);
      if (settings) await this.saveSettings(settings);
      if (backup) await this.saveBackup(backup);

      console.log('All data re-encrypted successfully');
    } catch (error) {
      console.error('Error re-encrypting data:', error);
      throw error;
    }
  }

  // Clear corrupted storage data (recovery tool)
  static async clearCorruptedData(): Promise<void> {
    try {
      console.log('Clearing potentially corrupted storage data...');
      await AsyncStorage.removeItem(ENTRIES_KEY);
      await AsyncStorage.removeItem(ACTION_ITEMS_KEY);
      await AsyncStorage.removeItem(EXPENSES_KEY);
      console.log('Corrupted data cleared. App will start fresh.');
    } catch (error) {
      console.error('Error clearing corrupted data:', error);
      throw error;
    }
  }
}
