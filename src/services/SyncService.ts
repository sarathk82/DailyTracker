import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../contexts/AuthContext';
import { encryptData, decryptData } from '../utils/encryption';
import { Entry, Expense, ActionItem } from '../types';
import { StorageService } from '../utils/storage';

/**
 * Cloud sync service with end-to-end encryption
 * Syncs local data to Firebase Firestore
 */
export class SyncService {
  private static syncInProgress = false;
  private static lastSyncTime: Date | null = null;

  /**
   * Sync all local data to cloud
   */
  static async syncToCloud(userId: string, masterKey: string): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('Starting sync to cloud...');

      // Get all local data
      const entries = await StorageService.getEntries();
      const expenses = await StorageService.getExpenses();
      const actionItems = await StorageService.getActionItems();

      // Sync entries
      for (const entry of entries) {
        await this.syncEntry(userId, entry, masterKey);
      }

      // Sync expenses
      for (const expense of expenses) {
        await this.syncExpense(userId, expense, masterKey);
      }

      // Sync action items
      for (const item of actionItems) {
        await this.syncActionItem(userId, item, masterKey);
      }

      // Update last sync timestamp
      await setDoc(
        doc(db, 'users', userId),
        { lastSync: new Date().toISOString() },
        { merge: true }
      );

      this.lastSyncTime = new Date();
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Download and decrypt all data from cloud
   */
  static async syncFromCloud(userId: string, masterKey: string): Promise<void> {
    try {
      console.log('Starting sync from cloud...');

      // Download entries
      const entriesSnapshot = await getDocs(
        collection(db, 'users', userId, 'entries')
      );
      const entries: Entry[] = [];
      entriesSnapshot.forEach((doc) => {
        const data = doc.data();
        const decrypted = decryptData(data.encryptedData, masterKey);
        entries.push(decrypted);
      });

      // Download expenses
      const expensesSnapshot = await getDocs(
        collection(db, 'users', userId, 'expenses')
      );
      const expenses: Expense[] = [];
      expensesSnapshot.forEach((doc) => {
        const data = doc.data();
        const decrypted = decryptData(data.encryptedData, masterKey);
        expenses.push(decrypted);
      });

      // Download action items
      const actionItemsSnapshot = await getDocs(
        collection(db, 'users', userId, 'actionItems')
      );
      const actionItems: ActionItem[] = [];
      actionItemsSnapshot.forEach((doc) => {
        const data = doc.data();
        const decrypted = decryptData(data.encryptedData, masterKey);
        actionItems.push(decrypted);
      });

      // Save to local storage
      await StorageService.saveEntries(entries);
      
      // Save expenses individually
      for (const expense of expenses) {
        await StorageService.addExpense(expense);
      }
      
      // Save action items individually
      for (const item of actionItems) {
        await StorageService.addActionItem(item);
      }

      console.log('Downloaded and decrypted all data');
    } catch (error) {
      console.error('Sync from cloud error:', error);
      throw error;
    }
  }

  /**
   * Sync a single entry
   */
  private static async syncEntry(
    userId: string,
    entry: Entry,
    masterKey: string
  ): Promise<void> {
    const encrypted = encryptData(entry, masterKey);
    await setDoc(doc(db, 'users', userId, 'entries', entry.id), {
      encryptedData: encrypted,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Sync a single expense
   */
  private static async syncExpense(
    userId: string,
    expense: Expense,
    masterKey: string
  ): Promise<void> {
    const encrypted = encryptData(expense, masterKey);
    await setDoc(doc(db, 'users', userId, 'expenses', expense.id), {
      encryptedData: encrypted,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Sync a single action item
   */
  private static async syncActionItem(
    userId: string,
    item: ActionItem,
    masterKey: string
  ): Promise<void> {
    const encrypted = encryptData(item, masterKey);
    await setDoc(doc(db, 'users', userId, 'actionItems', item.id), {
      encryptedData: encrypted,
      createdAt: item.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete an entry from cloud
   */
  static async deleteEntry(userId: string, entryId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'entries', entryId));
  }

  /**
   * Delete an expense from cloud
   */
  static async deleteExpense(userId: string, expenseId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'expenses', expenseId));
  }

  /**
   * Delete an action item from cloud
   */
  static async deleteActionItem(userId: string, itemId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'actionItems', itemId));
  }

  /**
   * Listen for real-time updates from cloud
   */
  static subscribeToUpdates(
    userId: string,
    masterKey: string,
    onUpdate: () => void
  ): () => void {
    const unsubscribeEntries = onSnapshot(
      collection(db, 'users', userId, 'entries'),
      () => {
        console.log('Entries updated in cloud');
        onUpdate();
      }
    );

    const unsubscribeExpenses = onSnapshot(
      collection(db, 'users', userId, 'expenses'),
      () => {
        console.log('Expenses updated in cloud');
        onUpdate();
      }
    );

    const unsubscribeActionItems = onSnapshot(
      collection(db, 'users', userId, 'actionItems'),
      () => {
        console.log('Action items updated in cloud');
        onUpdate();
      }
    );

    // Return cleanup function
    return () => {
      unsubscribeEntries();
      unsubscribeExpenses();
      unsubscribeActionItems();
    };
  }

  /**
   * Get last sync time
   */
  static getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}
