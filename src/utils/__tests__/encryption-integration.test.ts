import { StorageService } from '../storage';
import { Entry, Expense, ActionItem } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Encryption Integration Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await AsyncStorage.clear();
  });

  test('should encrypt data when storing and decrypt when retrieving', async () => {
    const testEntry: Entry = {
      id: 'test-entry-1',
      text: 'Test entry with sensitive data',
      timestamp: new Date(),
      type: 'log',
      isMarkdown: false,
    };

    // Save entry (should be encrypted)
    await StorageService.addEntry(testEntry);

    // Retrieve entry (should be decrypted automatically)
    const entries = await StorageService.getEntries();
    
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(testEntry.id);
    expect(entries[0].text).toBe(testEntry.text);
  });

  test('should store encrypted data in AsyncStorage', async () => {
    const testEntry: Entry = {
      id: 'test-entry-2',
      text: 'Sensitive information',
      timestamp: new Date(),
      type: 'log',
      isMarkdown: false,
    };

    await StorageService.addEntry(testEntry);

    // Read raw data from AsyncStorage
    const rawData = await AsyncStorage.getItem('@daily_tracker_entries');
    
    expect(rawData).toBeTruthy();
    // Check that raw data doesn't contain plain text (encrypted)
    expect(rawData).not.toContain('Sensitive information');
    // Check that it's not plain JSON
    expect(() => JSON.parse(rawData!)).toThrow();
  });

  test('export should produce unencrypted JSON', async () => {
    const testEntry: Entry = {
      id: 'test-entry-3',
      text: 'Export test entry',
      timestamp: new Date(),
      type: 'log',
      isMarkdown: false,
    };

    await StorageService.addEntry(testEntry);

    // Get entries (decrypted)
    const entries = await StorageService.getEntries();
    
    // Simulate export (convert to JSON)
    const exportData = JSON.stringify({ entries });
    
    // Verify exported data is plain JSON
    const parsedExport = JSON.parse(exportData);
    expect(parsedExport.entries[0].text).toBe('Export test entry');
  });

  test('import should work with plain JSON', async () => {
    // Simulate plain JSON import data
    const importData = {
      entries: [
        {
          id: 'imported-1',
          text: 'Imported entry',
          timestamp: new Date().toISOString(),
          type: 'log',
          isMarkdown: false,
        },
      ],
      expenses: [],
      actionItems: [],
    };

    // Import data (should be encrypted when stored)
    await StorageService.saveEntries(importData.entries.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp),
      type: e.type as 'log' | 'action' | 'expense' | 'system',
    })));

    // Retrieve data (should be decrypted)
    const entries = await StorageService.getEntries();
    
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('imported-1');
    expect(entries[0].text).toBe('Imported entry');
  });

  test('should handle multiple data types with encryption', async () => {
    const testEntry: Entry = {
      id: 'entry-1',
      text: 'Test entry',
      timestamp: new Date(),
      type: 'expense',
      isMarkdown: false,
    };

    const testExpense: Expense = {
      id: 'expense-1',
      entryId: 'entry-1',
      amount: 100,
      currency: 'USD',
      category: 'food',
      createdAt: new Date(),
    };

    const testActionItem: ActionItem = {
      id: 'action-1',
      entryId: 'entry-1',
      title: 'Test task',
      completed: false,
      createdAt: new Date(),
    };

    // Save all data types
    await StorageService.addEntry(testEntry);
    await StorageService.addExpense(testExpense);
    await StorageService.addActionItem(testActionItem);

    // Retrieve and verify
    const entries = await StorageService.getEntries();
    const expenses = await StorageService.getExpenses();
    const actionItems = await StorageService.getActionItems();

    expect(entries).toHaveLength(1);
    expect(expenses).toHaveLength(1);
    expect(actionItems).toHaveLength(1);

    expect(entries[0].text).toBe('Test entry');
    expect(expenses[0].amount).toBe(100);
    expect(actionItems[0].title).toBe('Test task');
  });

  test('should maintain data integrity through export-import cycle', async () => {
    // Create test data
    const testEntries: Entry[] = [
      {
        id: 'entry-1',
        text: 'First entry',
        timestamp: new Date('2026-01-01'),
        type: 'log',
        isMarkdown: false,
      },
      {
        id: 'entry-2',
        text: 'Second entry',
        timestamp: new Date('2026-01-02'),
        type: 'expense',
        isMarkdown: true,
      },
    ];

    // Save entries (encrypted)
    await StorageService.saveEntries(testEntries);

    // Export (decrypted)
    const exportedEntries = await StorageService.getEntries();
    const exportJSON = JSON.stringify({ entries: exportedEntries });

    // Clear storage
    await AsyncStorage.clear();

    // Import (re-encrypted)
    const importData = JSON.parse(exportJSON);
    await StorageService.saveEntries(importData.entries.map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    })));

    // Verify data integrity
    const reimportedEntries = await StorageService.getEntries();
    
    expect(reimportedEntries).toHaveLength(2);
    expect(reimportedEntries[0].text).toBe('First entry');
    expect(reimportedEntries[1].text).toBe('Second entry');
    expect(reimportedEntries[1].isMarkdown).toBe(true);
  });

  test('should handle backward compatibility with unencrypted data', async () => {
    // Simulate old unencrypted data
    const oldData = [
      {
        id: 'old-entry-1',
        text: 'Old unencrypted entry',
        timestamp: new Date().toISOString(),
        type: 'log',
        isMarkdown: false,
      },
    ];

    // Store as plain JSON (simulating old format)
    await AsyncStorage.setItem('@daily_tracker_entries', JSON.stringify(oldData));

    // Should be able to read old format
    const entries = await StorageService.getEntries();
    
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe('Old unencrypted entry');

    // After re-saving, should be encrypted
    await StorageService.saveEntries(entries);
    
    const rawData = await AsyncStorage.getItem('@daily_tracker_entries');
    expect(rawData).not.toContain('Old unencrypted entry');
  });
});
