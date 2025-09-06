import { TextAnalyzer } from '../textAnalysis';
import { Entry, ActionItem, Expense } from '../../types';

describe('TextAnalyzer', () => {
  let analyzer: TextAnalyzer;
  const mockDate = new Date('2025-09-02T10:00:00Z');

  beforeEach(() => {
    analyzer = new TextAnalyzer();
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectExpenses', () => {
    it('should detect expenses with dollar amounts', () => {
      const text = 'I spent $50.99 on groceries today';
      const expenses = analyzer.detectExpenses(text);
      
      expect(expenses).toHaveLength(1);
      expect(expenses[0]).toEqual(expect.objectContaining({
        amount: 50.99,
        currency: 'USD',
        description: expect.stringContaining('groceries'),
        category: expect.any(String)
      }));
    });

    it('should detect expenses with written dollar amounts', () => {
      const text = 'Paid 25 dollars for lunch';
      const expenses = analyzer.detectExpenses(text);
      
      expect(expenses).toHaveLength(1);
      expect(expenses[0]).toEqual(expect.objectContaining({
        amount: 25,
        currency: 'USD',
        description: expect.stringContaining('lunch'),
        category: 'food'
      }));
    });

    it('should detect multiple expenses in the same text', () => {
      const text = 'Spent $30 on lunch and 20 euros on transportation';
      const expenses = analyzer.detectExpenses(text);
      
      expect(expenses).toHaveLength(2);
      expect(expenses[0].currency).toBe('USD');
      expect(expenses[1].currency).toBe('EUR');
    });

    it('should detect expenses with different currency symbols', () => {
      const currencies = [
        { text: '£50 for books', currency: 'GBP' },
        { text: '€75.50 for dinner', currency: 'EUR' },
        { text: '₹500 for taxi', currency: 'INR' },
        { text: 'Rs. 1000 for shopping', currency: 'INR' }
      ];

      currencies.forEach(({ text, currency }) => {
        const expenses = analyzer.detectExpenses(text);
        expect(expenses[0].currency).toBe(currency);
      });
    });

    it('should not detect expenses without currency or amount', () => {
      const text = 'I went to the store today';
      const expenses = analyzer.detectExpenses(text);
      expect(expenses).toHaveLength(0);
    });
  });

  describe('detectActionItems', () => {
    it('should detect action items with todo keywords', () => {
      const text = 'Need to buy groceries tomorrow';
      const items = analyzer.detectActionItems(text);
      
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(expect.objectContaining({
        title: expect.stringContaining('buy groceries'),
        completed: false
      }));
    });

    it('should detect action items with task markers', () => {
      const text = '- [ ] Call dentist\n- [ ] Submit report';
      const items = analyzer.detectActionItems(text);
      
      expect(items).toHaveLength(2);
      expect(items[0].title).toContain('Call dentist');
      expect(items[1].title).toContain('Submit report');
    });

    it('should detect completed action items', () => {
      const text = '- [x] Finish presentation';
      const items = analyzer.detectActionItems(text);
      
      expect(items).toHaveLength(1);
      expect(items[0].completed).toBe(true);
    });

    it('should detect due dates in action items', () => {
      const text = 'Submit report by next Friday';
      const items = analyzer.detectActionItems(text);
      
      expect(items).toHaveLength(1);
      expect(items[0].dueDate).toBeInstanceOf(Date);
    });
  });

  describe('analyzeText', () => {
    it('should return both expenses and action items', () => {
      const text = 'Need to buy groceries for $50\nPaid €30 for dinner';
      const result = analyzer.analyzeText(text);
      
      expect(result.actionItems).toHaveLength(1);
      expect(result.expenses).toHaveLength(2);
    });

    it('should handle empty text', () => {
      const result = analyzer.analyzeText('');
      
      expect(result.actionItems).toHaveLength(0);
      expect(result.expenses).toHaveLength(0);
    });

    it('should handle text without any detectable items', () => {
      const result = analyzer.analyzeText('Just a regular journal entry.');
      
      expect(result.actionItems).toHaveLength(0);
      expect(result.expenses).toHaveLength(0);
    });
  });

  describe('categorizeSentiment', () => {
    it('should detect positive sentiment', () => {
      const text = 'I had a great day! Everything was wonderful.';
      const sentiment = analyzer.categorizeSentiment(text);
      expect(sentiment).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const text = 'This was a terrible day. Nothing went right.';
      const sentiment = analyzer.categorizeSentiment(text);
      expect(sentiment).toBe('negative');
    });

    it('should return neutral for mixed or unclear sentiment', () => {
      const text = 'Today was just a regular day.';
      const sentiment = analyzer.categorizeSentiment(text);
      expect(sentiment).toBe('neutral');
    });
  });
});
