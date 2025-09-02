import { Entry, ActionItem, Expense } from "../types";
import uuid from "react-native-uuid";

// Currency symbols and patterns
const CURRENCY_PATTERNS = [
  // Text patterns with explicit currency words first
  /\d+(\.\d{1,2})?\s*(dollars?|USD|bucks?)/gi, // USD text
  /\d+(\.\d{1,2})?\s*(rupees?|INR|rs\.?)/gi,   // INR text
  /\d+(\.\d{1,2})?\s*(euros?|EUR)/gi,          // EUR text
  /\d+(\.\d{1,2})?\s*(pounds?|GBP)/gi,         // GBP text
  // Symbol patterns second
  /\$\s*\d+(\.\d{1,2})?/gi,                    // USD symbol
  /₹\s*\d+(\.\d{1,2})?/gi,                     // INR symbol
  /(?:Rs\.?|rs\.?)\s*\d+(\.\d{1,2})?/gi,       // INR with Rs prefix
  /€\s*\d+(\.\d{1,2})?/gi,                     // EUR symbol
  /£\s*\d+(\.\d{1,2})?/gi                      // GBP symbol
];

// Expense keywords - expanded list
const EXPENSE_KEYWORDS = [
  "bought",
  "paid",
  "cost",
  "expense",
  "spent",
  "purchase",
  "bill",
  "invoice",
  "receipt",
  "fee",
  "charge",
  "price",
  "money",
  "cash",
  "payment",
  "transaction",
  "shopping",
  "store",
  "restaurant",
  "buy",
  "sold",
  "sale",
  "refund",
  "withdraw",
  "deposit",
  "transfer",
  "food",
  "lunch",
  "dinner",
  "breakfast",
  "coffee",
  "gas",
  "fuel",
  "groceries",
  "uber",
  "taxi",
  "rent",
  "mortgage",
  "utilities",
  "subscription",
  "membership",
  "tip",
  "tipped",
  "ordered",
];

// Action item keywords - expanded list
const ACTION_KEYWORDS = [
  "need to",
  "must",
  "todo",
  "reminder",
  "remember",
  "task",
  "should",
  "have to",
  "required",
  "deadline",
  "due",
  "schedule",
  "appointment",
  "meeting",
  "call",
  "email",
  "follow up",
  "buy",
  "get",
  "pick up",
  "finish",
  "complete",
  "start",
  "contact",
  "reach out",
  "check",
  "review",
  "submit",
  "apply",
  "book",
  "reserve",
  "cancel",
  "confirm",
];

// Action item patterns
const ACTION_PATTERNS = [
  /[-*]\s*\[\s*\]\s*(.+)$/gm, // Markdown checklist format (both - and *)
  /TODO:?\s*(.+)$/gim, // TODO format
  /REMINDER:?\s*(.+)$/gim, // Reminder format
  /\b(need to|must|should|have to|remember to|don't forget to)\s+(.+)/gim, // Action phrases
];

// Currency formatting function
export function formatCurrency(amount: number, currency: string): string {
  // Format without thousands separators
  const formatted = amount.toFixed(2);

  switch (currency) {
    case 'USD':
      return `$${formatted}`;
    case 'EUR':
      return `€${formatted}`;
    case 'GBP':
      return `£${formatted}`;
    case 'INR':
      return `₹${formatted}`;
    default:
      return `${currency}${formatted}`;
  }
}

export function extractActionItem(text: string, entryId: string): ActionItem | null {
  // First try checklist pattern
  const checklistMatch = /[-*]\s*\[\s*\]\s*(.+)$/gm.exec(text);
  if (checklistMatch) {
    return {
      id: uuid.v4() as string,
      entryId,
      title: checklistMatch[1].trim(),
      description: text.trim(),
      completed: false,
      createdAt: new Date(),
    };
  }

  // Then try TODO/REMINDER pattern
  const todoMatch = /(?:TODO|REMINDER):?\s*(.+)$/gim.exec(text);
  if (todoMatch) {
    return {
      id: uuid.v4() as string,
      entryId,
      title: todoMatch[1].trim(),
      description: text.trim(),
      completed: false,
      createdAt: new Date(),
    };
  }

  // Then try action phrases
  const actionMatch = /\b(?:need to|must|should|have to|remember to|don't forget to)\s+(.+)/gim.exec(text);
  if (actionMatch) {
    return {
      id: uuid.v4() as string,
      entryId,
      title: actionMatch[1].trim(),
      description: text.trim(),
      completed: false,
      createdAt: new Date(),
    };
  }

  // If no pattern matches but it contains an action keyword, use the full text
  const lowerText = text.toLowerCase();
  if (ACTION_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
    return {
      id: uuid.v4() as string,
      entryId,
      title: text.trim(),
      description: text.trim(),
      completed: false,
      createdAt: new Date(),
    };
  }

  return null;
}

export function detectExpense(text: string): boolean {
  console.log('Checking for expense in text:', text);
  // Check for currency patterns
  for (const pattern of CURRENCY_PATTERNS) {
    pattern.lastIndex = 0; // Reset pattern
    if (pattern.test(text)) {
      console.log('Found expense pattern:', pattern);
      return true;
    }
  }

  // Check for expense keywords
  const lowerText = text.toLowerCase();
  return EXPENSE_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

export function detectActionItem(text: string): boolean {
  // Check for action patterns
  for (const pattern of ACTION_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for action keywords
  const lowerText = text.toLowerCase();
  return ACTION_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

export function extractExpenseInfo(
  text: string,
  entryId: string
): Expense | null {
  console.log('Extracting expense info from:', text);
  let amount = 0;
  let currency = "USD";  // Default to USD
  
  // Try to extract amount and currency from currency patterns
  for (const pattern of CURRENCY_PATTERNS) {
    pattern.lastIndex = 0;  // Reset pattern
    const matches = text.match(pattern);
    if (matches) {
      const match = matches[0];
      console.log('Processing match:', match);
      
      const numMatch = match.match(/(\d+(?:\.\d{1,2})?)/);
      if (numMatch) {
        amount = parseFloat(numMatch[1]);
        
        // First check for text-based currency names
        if (match.toLowerCase().includes("dollar") || 
            match.toLowerCase().includes("usd") || 
            match.toLowerCase().includes("buck") ||
            match.includes("$")) {
          currency = "USD";
        } else if (match.toLowerCase().includes("rupee") || 
                   match.toLowerCase().includes("inr") || 
                   match.toLowerCase().includes("rs.") || 
                   match.toLowerCase().includes("rs ") || 
                   match.includes("₹")) {
          currency = "INR";
        } else if (match.toLowerCase().includes("euro") || 
                   match.toLowerCase().includes("eur") || 
                   match.includes("€")) {
          currency = "EUR";
        } else if (match.toLowerCase().includes("pound") || 
                   match.toLowerCase().includes("gbp") || 
                   match.includes("£")) {
          currency = "GBP";
        } else if (/rs\.?|Rs\.?/.test(match)) {
          currency = "INR";
        }
        break;  // Stop after first valid match
      }
    }
  }

  // If no amount found from currency patterns, try finding numbers in expense context
  if (amount === 0) {
    const lowerText = text.toLowerCase();
    const hasExpenseContext = EXPENSE_KEYWORDS.some((keyword) =>
      lowerText.includes(keyword)
    );

    if (hasExpenseContext) {
      // Look for standalone numbers that might be amounts
      const numberMatch = text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
      if (numberMatch) {
        const potentialAmount = parseFloat(numberMatch[1]);
        // Only consider reasonable amounts (between 0.01 and 100000)
        if (potentialAmount >= 0.01 && potentialAmount <= 100000) {
          amount = potentialAmount;
          currency = "USD"; // Default to USD when no currency is specified
        }
      }
    }
  }

  if (amount > 0) {
    return {
      id: uuid.v4() as string,
      entryId,
      amount,
      currency,
      description: text.trim(),
      createdAt: new Date(),
    };
  }

  return null;
}
