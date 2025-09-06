import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../storage';
import { Entry, ActionItem, Expense } from '../../types';

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Entries', () => {
    const mockEntry: Entry = {
      id: 'test-uuid',
      text: 'Test entry',
      timestamp: new Date('2025-09-02T10:00:00Z'),
      type: 'log',
      isMarkdown: false
    };

    it('should get entries from storage', async () => {
      const storedEntries = [{ ...mockEntry, timestamp: mockEntry.timestamp.toISOString() }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedEntries));

      const entries = await StorageService.getEntries();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@daily_tracker_entries');
      expect(entries).toEqual([mockEntry]);
    });

    it('should add a new entry', async () => {
      const existingEntries: Entry[] = [];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingEntries));

      await StorageService.addEntry(mockEntry);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@daily_tracker_entries',
        expect.stringContaining(mockEntry.text)
      );
    });

    it('should save multiple entries', async () => {
      const entries = [mockEntry];
      await StorageService.saveEntries(entries);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@daily_tracker_entries',
        JSON.stringify(entries)
      );
    });
  });

  describe('Action Items', () => {
    const mockActionItem: ActionItem = {
      id: 'test-uuid',
      entryId: 'entry-uuid',
      title: 'Test action item',
      description: 'Test description',
      completed: false,
      createdAt: new Date('2025-09-02T10:00:00Z'),
      dueDate: new Date('2025-09-03T10:00:00Z')
    };

    it('should get action items from storage', async () => {
      const storedItems = [{ ...mockActionItem, createdAt: mockActionItem.createdAt.toISOString() }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedItems));

      const items = await StorageService.getActionItems();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@daily_tracker_action_items');
      expect(items[0].createdAt).toBeInstanceOf(Date);
      expect(items[0].title).toBe(mockActionItem.title);
    });

    it('should save multiple action items', async () => {
      const items = [mockActionItem];
      await StorageService.saveActionItems(items);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@daily_tracker_action_items',
        expect.any(String)
      );
    });

    it('should update action item completion status', async () => {
      const existingItems = [mockActionItem];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingItems));

      await StorageService.updateActionItem(
        mockActionItem.id,
        { ...mockActionItem, completed: true }
      );

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@daily_tracker_action_items',
        expect.stringContaining('"completed":true')
      );
    });
  });

  describe('Expenses', () => {
    const mockExpense: Expense = {
      id: 'test-uuid',
      entryId: 'entry-uuid',
      amount: 100,
      currency: 'USD',
      description: 'Test expense',
      category: 'food',
      createdAt: new Date('2025-09-02T10:00:00Z')
    };

    it('should get expenses from storage', async () => {
      const storedExpenses = [{ ...mockExpense, createdAt: mockExpense.createdAt.toISOString() }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedExpenses));

      const expenses = await StorageService.getExpenses();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@daily_tracker_expenses');
      expect(expenses[0].createdAt).toBeInstanceOf(Date);
      expect(expenses[0].amount).toBe(mockExpense.amount);
    });

    it('should save multiple expenses to storage', async () => {
      const expenses = [mockExpense];
      await StorageService.saveExpenses(expenses);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@daily_tracker_expenses',
        expect.any(String)
      );
    });
  });
});
