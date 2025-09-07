import { Entry, ActionItem, Expense } from "../types";
import uuid from "react-native-uuid";

export class TextAnalyzer {
  // Currency patterns
  private static readonly CURRENCY_PATTERNS = [
    // INR patterns (listed first for priority)
    /(?:Rs\.?|rs\.?|RS\.?)\s*\d+(\.\d{1,2})?/gi,        // INR with Rs prefix
    /\d+(\.\d{1,2})?\s*(rupees?|INR|rs\.?|RS\.?)/gi,    // INR text
    /₹\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*₹/gi,   // INR symbol before or after
    
    // Other currencies
    /\d+(\.\d{1,2})?\s*(dollars?|USD|bucks?)/gi,  // USD text
    /\$\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*\$/gi, // USD symbol before or after
    /\d+(\.\d{1,2})?\s*(euros?|EUR)/gi,           // EUR text
    /€\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*€/gi,   // EUR symbol before or after
    /\d+(\.\d{1,2})?\s*(pounds?|GBP)/gi,          // GBP text
    /£\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*£/gi    // GBP symbol before or after
  ];

  // Keywords for expenses
  private static readonly EXPENSE_KEYWORDS: string[] = [
    "spent", "bought", "purchased", "paid", "cost",
    "expense", "payment", "buy", "pay", "shopping",
    "store", "bill", "receipt"
  ];

  // Keywords for action items
  private static readonly ACTION_KEYWORDS: string[] = [
    "todo", "to-do", "task", "need to", "should",
    "must", "have to", "action", "plan", "schedule",
    "remind", "remember", "don't forget", "important",
    "deadline", "due", "appointment", "meeting", "call",
    "email", "follow up", "buy", "get", "pick up",
    "finish", "complete", "start", "contact", "reach out",
    "check", "review", "submit", "apply", "book", "reserve"
  ];

  // Regular expressions for action items
  private static readonly ACTION_PATTERNS: RegExp[] = [
    /\bto-?do:?\s*([^.!?\n]+)/gi,
    /\btask:?\s*([^.!?\n]+)/gi,
    /\baction:?\s*([^.!?\n]+)/gi,
    /\bremind(?:er)?:?\s*([^.!?\n]+)/gi,
    /\bneed to:?\s*([^.!?\n]+)/gi,
    /\bshould:?\s*([^.!?\n]+)/gi,
    /\bmust:?\s*([^.!?\n]+)/gi,
    /\bhave to:?\s*([^.!?\n]+)/gi
  ];

  static detectActionItem(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.ACTION_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }

  static detectExpense(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.EXPENSE_KEYWORDS.some(keyword => lowerText.includes(keyword)) ||
           this.CURRENCY_PATTERNS.some(pattern => pattern.test(text));
  }

  static extractActionItem(text: string, entryId: string): ActionItem | null {
    if (this.detectActionItem(text)) {
      return {
        id: uuid.v4() as string,
        entryId,
        title: text,
        completed: false,
        createdAt: new Date()
      };
    }
    return null;
  }

  static extractExpenseInfo(text: string, entryId: string): Expense | null {
    const amount = this.extractAmount(text);
    if (!amount) return null;

    return {
      id: uuid.v4() as string,
      entryId,
      amount: amount.value,
      currency: amount.currency,
      description: text,
      createdAt: new Date()
    };
  }

  private static extractAmount(text: string): { value: number; currency: string } | null {
    for (const pattern of this.CURRENCY_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const matchedText = match[0].trim();
        const numericPart = matchedText.replace(/[^\d.]/g, '');
        const value = parseFloat(numericPart);
        if (!isNaN(value)) {
          return {
            value,
            currency: this.determineCurrency(matchedText)
          };
        }
      }
    }
    return null;
  }

  private static determineCurrency(text: string): string {
    const lowerText = text.toLowerCase();
    // Check for INR first (including 'rs' without dot)
    if (lowerText.includes('₹') || 
        /\b(rs\.?|RS\.?)\b/.test(text) || 
        lowerText.includes('rupee') || 
        lowerText.includes('inr')) {
      return 'INR';
    }
    if (lowerText.includes('€') || lowerText.includes('eur')) return 'EUR';
    if (lowerText.includes('£') || lowerText.includes('gbp')) return 'GBP';
    if (lowerText.includes('$') || lowerText.includes('usd') || lowerText.includes('dollar')) return 'USD';
    
    // Look for numeric patterns with Rs prefix
    if (/(?:Rs\.?|rs\.?|RS\.?)\s*\d+/.test(text)) {
      return 'INR';
    }
    
    // If no specific currency symbol/text is found, look for context
    if (lowerText.includes('spent') || lowerText.includes('cost')) {
      // Check if there's any hint of Indian location/context
      if (lowerText.includes('india') || lowerText.includes('indian')) {
        return 'INR';
      }
    }
    
    // Default to INR if no other currency is clearly specified
    // This assumes the app is primarily used in India
    return 'INR';
  }

  static formatCurrency(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(amount);
  }

  static isExpenseRelated(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.EXPENSE_KEYWORDS.some((keyword: string) => lowerText.includes(keyword));
  }
}
