import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, ActionItem, Expense, SettingsData } from '../types';

const ENTRIES_KEY = '@daily_tracker_entries';
const ACTION_ITEMS_KEY = '@daily_tracker_action_items';
const EXPENSES_KEY = '@daily_tracker_expenses';
const SETTINGS_KEY = '@daily_tracker_settings';
const BACKUP_KEY = '@daily_tracker_backup';

export class StorageService {
  // Entries
  static async getEntries(): Promise<Entry[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(ENTRIES_KEY);
      if (jsonValue != null) {
        const entries = JSON.parse(jsonValue);
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
      const jsonValue = JSON.stringify(entries);
      await AsyncStorage.setItem(ENTRIES_KEY, jsonValue);
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
      const jsonValue = await AsyncStorage.getItem(ACTION_ITEMS_KEY);
      if (jsonValue != null) {
        const actionItems = JSON.parse(jsonValue);
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
      const jsonValue = JSON.stringify(actionItems);
      await AsyncStorage.setItem(ACTION_ITEMS_KEY, jsonValue);
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
      const jsonValue = await AsyncStorage.getItem(EXPENSES_KEY);
      if (jsonValue != null) {
        const expenses = JSON.parse(jsonValue);
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
      const jsonValue = JSON.stringify(expenses);
      await AsyncStorage.setItem(EXPENSES_KEY, jsonValue);
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
      const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Error getting settings:', e);
      return null;
    }
  }

  static async saveSettings(settings: SettingsData): Promise<void> {
    try {
      const jsonValue = JSON.stringify(settings);
      await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  // Backup & Restore
  static async saveBackup(backup: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(backup);
      await AsyncStorage.setItem(BACKUP_KEY, jsonValue);
    } catch (e) {
      console.error('Error saving backup:', e);
    }
  }

  static async getBackup(): Promise<any> {
    try {
      const jsonValue = await AsyncStorage.getItem(BACKUP_KEY);
      if (jsonValue != null) {
        const backup = JSON.parse(jsonValue);
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
}

