import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, ActionItem, Expense } from '../types';

const ENTRIES_KEY = '@daily_tracker_entries';
const ACTION_ITEMS_KEY = '@daily_tracker_action_items';
const EXPENSES_KEY = '@daily_tracker_expenses';

export class StorageService {
  // Entries
  static async getEntries(): Promise<Entry[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(ENTRIES_KEY);
      if (jsonValue != null) {
        const entries = JSON.parse(jsonValue);
        // Convert timestamp strings back to Date objects
        return entries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
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
        await this.saveActionItems(actionItems);
      }
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
        return expenses.map((expense: any) => ({
          ...expense,
          createdAt: new Date(expense.createdAt),
        }));
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
}
