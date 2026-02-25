import { TextAnalyzer } from '../textAnalysis';
import { ActionItem, Expense } from '../../types';

// Mock LLMClassificationService so tests are fast and deterministic
jest.mock('../../services/LLMClassificationService', () => ({
  LLMClassificationService: {
    classifyText: jest.fn(async (text: string) => {
      const lower = text.toLowerCase();
      // Expense signals
      if (/\$|rs\s|₹|paid|spent|cost|bought|purchased/.test(lower) && /\d/.test(lower)) {
        const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;
        const currency = /rs\s|₹/i.test(text) ? 'INR' : (text.includes('$') ? 'USD' : undefined);
        return { type: 'expense', extractedData: { amount, currency } };
      }
      // Action signals
      if (/^\.|todo:|need to|call |buy |finish /i.test(lower)) {
        return { type: 'action', extractedData: {} };
      }
      return { type: 'note', extractedData: {} };
    }),
  },
}));

describe('TextAnalyzer', () => {
  const mockDate = new Date('2025-09-02T10:00:00Z');

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectExpenseAsync', () => {
    it('should detect expenses with dollar amounts', async () => {
      const text = 'I spent $50.99 on groceries today';
      const isExpense = await TextAnalyzer.detectExpenseAsync(text);
      expect(isExpense).toBe(true);
    });

    it('should detect expense with Rs symbol', async () => {
      const text = 'Rs 500 for haircut';
      const isExpense = await TextAnalyzer.detectExpenseAsync(text);
      expect(isExpense).toBe(true);
    });

    it('should not detect regular text as expense', async () => {
      const text = 'The weather is nice today';
      const isExpense = await TextAnalyzer.detectExpenseAsync(text);
      expect(isExpense).toBe(false);
    });
  });

  describe('detectActionItemAsync', () => {
    it('should detect action items with dot prefix', async () => {
      const text = '. Call dentist tomorrow';
      const isAction = await TextAnalyzer.detectActionItemAsync(text);
      expect(isAction).toBe(true);
    });

    it('should detect action items with todo keywords', async () => {
      const text = 'todo: finish presentation';
      const isAction = await TextAnalyzer.detectActionItemAsync(text);
      expect(isAction).toBe(true);
    });

    it('should not detect regular text as action item', async () => {
      const text = 'The weather is nice today';
      const isAction = await TextAnalyzer.detectActionItemAsync(text);
      expect(isAction).toBe(false);
    });
  });

  describe('extractExpenseInfoAsync', () => {
    it('should extract expense information from text', async () => {
      const text = 'Spent $50 on groceries';
      const expense = await TextAnalyzer.extractExpenseInfoAsync(text, 'entry-1');
      expect(expense).not.toBeNull();
      expect(expense?.amount).toBe(50);
      expect(expense?.currency).toBe('USD');
      expect(expense?.entryId).toBe('entry-1');
    });

    it('should handle Rs currency', async () => {
      const text = 'Paid Rs 200 for taxi';
      const expense = await TextAnalyzer.extractExpenseInfoAsync(text, 'entry-1');
      expect(expense).not.toBeNull();
      expect(expense?.amount).toBe(200);
      expect(expense?.currency).toBe('INR');
    });

    it('should return null for text without amounts', async () => {
      const text = 'Went shopping today';
      const expense = await TextAnalyzer.extractExpenseInfoAsync(text, 'entry-1');
      expect(expense).toBeNull();
    });
  });

  describe('extractActionItemAsync', () => {
    it('should extract action item from text', async () => {
      const text = '. Call dentist tomorrow';
      const actionItem = await TextAnalyzer.extractActionItemAsync(text, 'entry-1');
      expect(actionItem).not.toBeNull();
      expect(actionItem?.title).toContain('Call dentist');
      expect(actionItem?.entryId).toBe('entry-1');
      expect(actionItem?.completed).toBe(false);
    });

    it('should handle todo keyword', async () => {
      const text = 'todo: finish presentation';
      const actionItem = await TextAnalyzer.extractActionItemAsync(text, 'entry-1');
      expect(actionItem).not.toBeNull();
      expect(actionItem?.title).toContain('finish presentation');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      const formatted = TextAnalyzer.formatCurrency(50.99, 'USD');
      expect(formatted).toBe('$50.99');
    });

    it('should format INR currency', () => {
      const formatted = TextAnalyzer.formatCurrency(500, 'INR');
      expect(formatted).toBe('₹500.00');
    });

    it('should format EUR currency', () => {
      const formatted = TextAnalyzer.formatCurrency(75.5, 'EUR');
      expect(formatted).toBe('€75.50');
    });

    it('should format GBP currency', () => {
      const formatted = TextAnalyzer.formatCurrency(100, 'GBP');
      expect(formatted).toBe('£100.00');
    });

    it('should handle default currency', () => {
      const formatted = TextAnalyzer.formatCurrency(50);
      expect(formatted).toBeTruthy();
      expect(formatted).toMatch(/50/);
    });
  });

  describe('extractDueDate', () => {
    it('should extract today as due date', () => {
      const result = TextAnalyzer.extractDueDate('Call dentist today');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(result.getTime()).toBe(today.getTime());
    });

    it('should extract tomorrow as due date', () => {
      const result = TextAnalyzer.extractDueDate('Buy groceries tomorrow');
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.getTime()).toBe(tomorrow.getTime());
    });

    it('should default to today when no date found', () => {
      const result = TextAnalyzer.extractDueDate('Do the thing');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(result.getTime()).toBe(today.getTime());
    });
  });
});
