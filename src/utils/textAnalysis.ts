import { Entry, ActionItem, Expense } from "../types";
import uuid from "react-native-uuid";

export class TextAnalyzer {
  // Currency patterns
  private static readonly CURRENCY_PATTERNS = [
    /\d+(\.\d{1,2})?\s*(dollars?|USD|bucks?)/gi,  // USD text
    /\d+(\.\d{1,2})?\s*(rupees?|INR|rs\.?)/gi,    // INR text
    /\d+(\.\d{1,2})?\s*(euros?|EUR)/gi,           // EUR text
    /\d+(\.\d{1,2})?\s*(pounds?|GBP)/gi,          // GBP text
    /\$\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*\$/gi, // USD symbol before or after
    /₹\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*₹/gi,   // INR symbol before or after
    /(?:Rs\.?|rs\.?)\s*\d+(\.\d{1,2})?/gi,        // INR with Rs prefix
    /€\s*\d+(\.\d{1,2})?|\d+(\.\d{1,2})?\s*€/gi,   // EUR symbol before or after
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
    if (lowerText.includes('₹') || lowerText.includes('rs.') || lowerText.includes('rupee')) return 'INR';
    if (lowerText.includes('€') || lowerText.includes('eur')) return 'EUR';
    if (lowerText.includes('£') || lowerText.includes('gbp')) return 'GBP';
    return 'USD'; // Default to USD for $ or unspecified currency
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
