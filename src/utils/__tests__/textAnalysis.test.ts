import { TextAnalyzer } from '../textAnalysis';
import { Entry, ActionItem, Expense } from '../../types';

describe('TextAnalyzer', () => {
  const mockDate = new Date('2025-09-02T10:00:00Z');

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectExpense', () => {
    it('should detect expenses with dollar amounts', () => {
      const text = 'I spent $50.99 on groceries today';
      const isExpense = TextAnalyzer.detectExpense(text);
      
      expect(isExpense).toBe(true);
    });

    it('should detect expenses with written dollar amounts', () => {
      const text = 'Paid 25 dollars for lunch';
      const isExpense = TextAnalyzer.detectExpense(text);
      
      expect(isExpense).toBe(true);
    });

    it('should not detect expenses without context', () => {
      const text = 'I went to the store today';
      const isExpense = TextAnalyzer.detectExpense(text);
      
      expect(isExpense).toBe(false);
    });

    it('should detect expense with Rs symbol', () => {
      const text = 'Rs 500 for haircut';
      const isExpense = TextAnalyzer.detectExpense(text);
      
      expect(isExpense).toBe(true);
    });
  });

  describe('detectActionItem', () => {
    it('should detect action items with dot prefix', () => {
      const text = '. Call dentist tomorrow';
      const isAction = TextAnalyzer.detectActionItem(text);
      
      expect(isAction).toBe(true);
    });

    it('should detect action items with todo keywords', () => {
      const text = 'Need to buy groceries tomorrow';
      const isAction = TextAnalyzer.detectActionItem(text);
      
      expect(isAction).toBe(true);
    });

    it('should not detect regular text as action item', () => {
      const text = 'The weather is nice today';
      const isAction = TextAnalyzer.detectActionItem(text);
      
      expect(isAction).toBe(false);
    });
  });

  describe('extractExpenseInfo', () => {
    it('should extract expense information from text', () => {
      const text = 'Spent $50 on groceries';
      const expense = TextAnalyzer.extractExpenseInfo(text, 'entry-1');
      
      expect(expense).not.toBeNull();
      expect(expense?.amount).toBe(50);
      expect(expense?.currency).toBe('USD');
      expect(expense?.entryId).toBe('entry-1');
    });

    it('should handle Rs currency', () => {
      const text = 'Paid Rs 200 for taxi';
      const expense = TextAnalyzer.extractExpenseInfo(text, 'entry-1');
      
      expect(expense).not.toBeNull();
      expect(expense?.amount).toBe(200);
      expect(expense?.currency).toBe('INR');
    });

    it('should return null for text without amounts', () => {
      const text = 'Went shopping today';
      const expense = TextAnalyzer.extractExpenseInfo(text, 'entry-1');
      
      expect(expense).toBeNull();
    });
  });

  describe('extractActionItem', () => {
    it('should extract action item from text', () => {
      const text = '. Call dentist tomorrow';
      const actionItem = TextAnalyzer.extractActionItem(text, 'entry-1');
      
      expect(actionItem).not.toBeNull();
      expect(actionItem?.title).toContain('Call dentist');
      expect(actionItem?.entryId).toBe('entry-1');
      expect(actionItem?.completed).toBe(false);
    });

    it('should handle todo keyword', () => {
      const text = 'todo: finish presentation';
      const actionItem = TextAnalyzer.extractActionItem(text, 'entry-1');
      
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

  describe('isExpenseRelated', () => {
    it('should identify expense-related text', () => {
      const text = 'Spent money on lunch';
      expect(TextAnalyzer.isExpenseRelated(text)).toBe(true);
    });

    it('should identify paid as expense', () => {
      const text = 'Paid the bill today';
      expect(TextAnalyzer.isExpenseRelated(text)).toBe(true);
    });

    it('should not identify regular text as expense', () => {
      const text = 'Had a great day';
      expect(TextAnalyzer.isExpenseRelated(text)).toBe(false);
    });
  });
});
